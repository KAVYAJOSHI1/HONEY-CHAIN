import os
import hashlib
import json
import base64
from fastapi import HTTPException

BLOCKCHAIN_MODE = os.getenv("BLOCKCHAIN_MODE", "demo")
IPFS_MODE = os.getenv("IPFS_MODE", "demo")

class IPFSService:
    @staticmethod
    def pin_json(data: dict) -> str:
        if IPFS_MODE == "real":
            # Real implementation using Pinata / Web3.Storage goes here
            # e.g., requests.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', json=data, ...)
            raise HTTPException(status_code=501, detail="Real IPFS provider not configured")
        
        # Mock deterministic CID
        data_str = json.dumps(data, sort_keys=True)
        hash_obj = hashlib.sha256(data_str.encode('utf-8')).digest()
        b64_str = base64.b64encode(hash_obj).decode('utf-8').replace('+', 'X').replace('/', 'Y').replace('=', '')
        return f"ipfs://Qm{b64_str[:44]}"


class BlockchainService:
    @staticmethod
    def mint_token(canonical_string: str, ipfs_uri: str, floral_source: str) -> str:
        if BLOCKCHAIN_MODE == "sepolia":
            try:
                from web3 import Web3
                import os
                
                infura_url = os.getenv("INFURA_URL")
                private_key = os.getenv("PRIVATE_KEY")
                contract_address = os.getenv("CONTRACT_ADDRESS")
                
                if not all([infura_url, private_key, contract_address]):
                    raise HTTPException(status_code=500, detail="Missing Web3 credentials in .env")
                
                w3 = Web3(Web3.HTTPProvider(infura_url))
                
                if not w3.is_connected():
                    raise HTTPException(status_code=500, detail="Failed to connect to Ethereum network")
                
                account = w3.eth.account.from_key(private_key)
                
                abi = [{
                    "inputs": [
                        {"internalType": "address", "name": "beekeeper", "type": "address"},
                        {"internalType": "string", "name": "ipfsURI", "type": "string"},
                        {"internalType": "string", "name": "floralSource", "type": "string"}
                    ],
                    "name": "mintBatch",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }]
                
                contract = w3.eth.contract(address=contract_address, abi=abi)
                
                nonce = w3.eth.get_transaction_count(account.address)
                tx = contract.functions.mintBatch(
                    account.address, # Assigning the minted token to the server's wallet for demo
                    ipfs_uri,
                    floral_source
                ).build_transaction({
                    'chainId': 11155111, # Sepolia
                    'gas': 500000,
                    'maxFeePerGas': w3.to_wei('100', 'gwei'),
                    'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
                    'nonce': nonce,
                })
                
                signed_tx = w3.eth.account.sign_transaction(tx, private_key)
                tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                return tx_hash.hex()
            except Exception as e:
                print("Blockchain Sepolia Network Error (falling back to demo hash):", e)
                return "0x" + hashlib.sha256(canonical_string.encode()).hexdigest()
        
        # Mock deterministic transaction hash
        return "0x" + hashlib.sha256(canonical_string.encode()).hexdigest()
