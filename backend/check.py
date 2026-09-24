import os, sys
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/4f00498492dd44139cfc2fd1db5e8e1a'))
if not w3.is_connected():
    print('Not connected to Sepolia')
    sys.exit(1)

print('Connected to Sepolia')
contract_address = '0x2464fC6c966eeB6C1907F201302493dA83ab3A85'
bytecode = w3.eth.get_code(contract_address)
print(f'Bytecode exists: {len(bytecode) > 0}')

account = w3.eth.account.from_key('b943e574b55e9a1ca7f0c3ae66cea3c3a2dee15792a2a1f98410abd104f1ff3e')
print(f'Signing address: {account.address}')
balance = w3.eth.get_balance(account.address)
print(f'Balance: {w3.from_wei(balance, "ether")} ETH')

abi = [{'inputs':[{'internalType':'bytes32','name':'role','type':'bytes32'},{'internalType':'address','name':'account','type':'address'}],'name':'hasRole','outputs':[{'internalType':'bool','name':'','type':'bool'}],'stateMutability':'view','type':'function'}, {'inputs':[],'name':'BEEKEEPER_ROLE','outputs':[{'internalType':'bytes32','name':'','type':'bytes32'}],'stateMutability':'view','type':'function'}, {'inputs':[],'name':'KVIC_ROLE','outputs':[{'internalType':'bytes32','name':'','type':'bytes32'}],'stateMutability':'view','type':'function'}]
contract = w3.eth.contract(address=contract_address, abi=abi)
beekeeper_role = contract.functions.BEEKEEPER_ROLE().call()
has_role = contract.functions.hasRole(beekeeper_role, account.address).call()
print(f'Has BEEKEEPER_ROLE: {has_role}')
kvic_role = contract.functions.KVIC_ROLE().call()
has_kvic = contract.functions.hasRole(kvic_role, account.address).call()
print(f'Has KVIC_ROLE: {has_kvic}')
