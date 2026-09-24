"""Sanity-check the Sepolia deployment: connectivity, contract bytecode, signer balance and roles.

Reads credentials from the environment (or the repo-root .env) — never hardcode keys here.
Usage: python check.py
"""
import os
import sys

from web3 import Web3

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

rpc_url = os.getenv("SEPOLIA_RPC_URL") or os.getenv("INFURA_URL")
private_key = os.getenv("PRIVATE_KEY")
contract_address = os.getenv("CONTRACT_ADDRESS")

missing = [name for name, val in [("SEPOLIA_RPC_URL", rpc_url), ("PRIVATE_KEY", private_key), ("CONTRACT_ADDRESS", contract_address)] if not val]
if missing:
    print(f"Missing environment variables: {', '.join(missing)}")
    sys.exit(1)

w3 = Web3(Web3.HTTPProvider(rpc_url))
if not w3.is_connected():
    print("Not connected to Sepolia")
    sys.exit(1)

print("Connected to Sepolia")
contract_address = Web3.to_checksum_address(contract_address)
bytecode = w3.eth.get_code(contract_address)
print(f"Bytecode exists: {len(bytecode) > 0}")

account = w3.eth.account.from_key(private_key)
print(f"Signing address: {account.address}")
balance = w3.eth.get_balance(account.address)
print(f"Balance: {w3.from_wei(balance, 'ether')} ETH")

abi = [
    {"inputs": [{"internalType": "bytes32", "name": "role", "type": "bytes32"}, {"internalType": "address", "name": "account", "type": "address"}], "name": "hasRole", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "BEEKEEPER_ROLE", "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "KVIC_ROLE", "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}], "stateMutability": "view", "type": "function"},
]
contract = w3.eth.contract(address=contract_address, abi=abi)
beekeeper_role = contract.functions.BEEKEEPER_ROLE().call()
print(f"Has BEEKEEPER_ROLE: {contract.functions.hasRole(beekeeper_role, account.address).call()}")
kvic_role = contract.functions.KVIC_ROLE().call()
print(f"Has KVIC_ROLE: {contract.functions.hasRole(kvic_role, account.address).call()}")
