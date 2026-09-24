import base64
import hashlib
import json
import logging
import os
import urllib.request
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

logger = logging.getLogger("honeychain.services")

BLOCKCHAIN_MODE = os.getenv("BLOCKCHAIN_MODE", "demo").lower()
IPFS_MODE = os.getenv("IPFS_MODE", "demo").lower()

HONEY_BATCH_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "beekeeper", "type": "address"},
            {"internalType": "string", "name": "ipfsURI", "type": "string"},
            {"internalType": "string", "name": "floralSource", "type": "string"},
        ],
        "name": "mintBatch",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "string", "name": "reason", "type": "string"},
        ],
        "name": "revokeBatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "beekeeper", "type": "address"},
            {"indexed": False, "internalType": "string", "name": "ipfsURI", "type": "string"},
        ],
        "name": "BatchMinted",
        "type": "event",
    },
]


def canonical_hash(canonical_string: str) -> str:
    return "0x" + hashlib.sha256(canonical_string.encode()).hexdigest()


class IPFSService:
    @staticmethod
    def pin_json(data: dict) -> str:
        if IPFS_MODE == "real":
            pinata_api_key = os.getenv("PINATA_API_KEY")
            pinata_secret_key = os.getenv("PINATA_SECRET_KEY")
            if pinata_api_key and pinata_secret_key:
                try:
                    payload = json.dumps({"pinataContent": data}).encode("utf-8")
                    req = urllib.request.Request(
                        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                        data=payload,
                        headers={
                            "Content-Type": "application/json",
                            "pinata_api_key": pinata_api_key,
                            "pinata_secret_api_key": pinata_secret_key,
                        },
                    )
                    with urllib.request.urlopen(req) as response:
                        res_data = json.loads(response.read().decode("utf-8"))
                        if "IpfsHash" in res_data:
                            return f"ipfs://{res_data['IpfsHash']}"
                except Exception as exc:
                    logger.warning("[PINATA_FALLBACK] Failed to pin to Pinata: %s", exc)
            else:
                logger.warning("[PINATA_FALLBACK] Pinata credentials missing")

        # Deterministic mock CID derived from the metadata content.
        data_str = json.dumps(data, sort_keys=True)
        digest = hashlib.sha256(data_str.encode("utf-8")).digest()
        b64_str = base64.b64encode(digest).decode("utf-8").replace("+", "X").replace("/", "Y").replace("=", "")
        return f"ipfs://Qm{b64_str[:44]}"

    @staticmethod
    def get_gateway_url(cid: str) -> str:
        if cid.startswith("ipfs://"):
            return cid.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
        return cid


@dataclass
class MintResult:
    tx_hash: str
    mode: str                       # "sepolia" when anchored on-chain, otherwise "demo"
    token_id: Optional[str] = None  # on-chain token id when known


class BlockchainService:
    @staticmethod
    def _connect():
        from web3 import Web3

        rpc_url = os.getenv("SEPOLIA_RPC_URL") or os.getenv("INFURA_URL")
        private_key = os.getenv("PRIVATE_KEY")
        contract_address = os.getenv("CONTRACT_ADDRESS")
        if not all([rpc_url, private_key, contract_address]):
            raise RuntimeError("SEPOLIA_RPC_URL, PRIVATE_KEY and CONTRACT_ADDRESS must be set")

        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 20}))
        if not w3.is_connected():
            raise RuntimeError("Failed to connect to Ethereum RPC")
        account = w3.eth.account.from_key(private_key)
        contract = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=HONEY_BATCH_ABI)
        return w3, account, contract, private_key

    @staticmethod
    def _send(w3, account, private_key, fn):
        tx = fn.build_transaction({
            "chainId": 11155111,  # Sepolia
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
        })
        try:
            latest_block = w3.eth.get_block('latest')
            base_fee = latest_block.get('baseFeePerGas', w3.to_wei('30', 'gwei'))
            max_priority = w3.to_wei('2', 'gwei')
            max_fee = base_fee * 2 + max_priority
            
            tx["maxFeePerGas"] = max_fee
            tx["maxPriorityFeePerGas"] = max_priority
        except Exception as exc:
            logger.warning("Dynamic gas estimation failed, using hardcoded fallback: %s", exc)
            tx["maxFeePerGas"] = w3.to_wei("50", "gwei")
            tx["maxPriorityFeePerGas"] = w3.to_wei("2", "gwei")
        tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
        signed = w3.eth.account.sign_transaction(tx, private_key)
        raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction  # web3 v7 / v6
        return w3.eth.send_raw_transaction(raw)

    @staticmethod
    def mint_token(canonical_string: str, ipfs_uri: str, floral_source: str) -> MintResult:
        if BLOCKCHAIN_MODE == "sepolia":
            try:
                w3, account, contract, private_key = BlockchainService._connect()
                tx_hash = BlockchainService._send(
                    w3, account, private_key,
                    contract.functions.mintBatch(account.address, ipfs_uri, floral_source),
                )
                token_id = None
                try:
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=90)
                    events = contract.events.BatchMinted().process_receipt(receipt)
                    if events:
                        token_id = str(events[0]["args"]["tokenId"])
                except Exception as exc:  # receipt may lag; the tx itself was sent
                    logger.warning("Minted but could not read BatchMinted event: %s", exc)
                hex_hash = tx_hash.hex()
                return MintResult(tx_hash=hex_hash if hex_hash.startswith("0x") else "0x" + hex_hash, mode="sepolia", token_id=token_id)
            except Exception as exc:
                logger.error("Sepolia mint failed, falling back to demo anchor: %s", exc)

        return MintResult(tx_hash=canonical_hash(canonical_string), mode="demo")

    @staticmethod
    def revoke_token(token_id: str, reason: str) -> Optional[str]:
        """Best-effort on-chain revocation. Returns the tx hash, or None when not on-chain."""
        if BLOCKCHAIN_MODE != "sepolia":
            return None
        try:
            w3, account, contract, private_key = BlockchainService._connect()
            tx_hash = BlockchainService._send(w3, account, private_key, contract.functions.revokeBatch(int(token_id), reason))
            hex_hash = tx_hash.hex()
            return hex_hash if hex_hash.startswith("0x") else "0x" + hex_hash
        except Exception as exc:
            logger.error("Sepolia revoke failed: %s", exc)
            return None
