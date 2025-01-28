# compile.py
from solcx import compile_standard, install_solc
import json


def compile_contract():
    # 安装特定版本的 solc
    install_solc('0.8.18')

    # 读取合约文件
    with open("test.sol", "r") as file:
        contract_source = file.read()

    # 编译合约
    compiled_sol = compile_standard(
        {
            "language": "Solidity",
            "sources": {"test.sol": {"content": contract_source}},
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": ["abi", "metadata", "evm.bytecode", "evm.bytecode.sourceMap"]
                    }
                }
            },
        },
        solc_version="0.8.18",
    )

    # 保存编译结果到文件
    with open("compiled_code.json", "w") as file:
        json.dump(compiled_sol, file)

    return compiled_sol


# deploy.py
from web3 import Web3
from eth_account import Account
import json
import os


def deploy_contract():
    # 连接到私有链
    w3 = Web3(Web3.HTTPProvider('http://47.128.241.199:8545'))

    # 检查连接
    if not w3.is_connected():
        raise Exception("Failed to connect to the Ethereum network")

    # 读取编译后的合约
    with open("compiled_code.json", "r") as file:
        compiled_sol = json.load(file)

    # 获取字节码和 ABI
    bytecode = compiled_sol["contracts"]["test.sol"]["SimpleStorage"]["evm"]["bytecode"]["object"]
    abi = compiled_sol["contracts"]["test.sol"]["SimpleStorage"]["abi"]

    # 创建合约对象
    SimpleStorage = w3.eth.contract(abi=abi, bytecode=bytecode)

    # 创建账户（这里使用私钥，实际使用时请安全保管私钥）
    private_key = os.getenv('ETH_PRIVATE_KEY', 'your-private-key-here')  # 请替换为实际的私钥
    account = Account.from_key(private_key)

    # 构建交易
    nonce = w3.eth.get_transaction_count(account.address)
    transaction = SimpleStorage.constructor().build_transaction({
        "chainId": 66633666,
        "gasPrice": w3.eth.gas_price,
        "from": account.address,
        "nonce": nonce,
    })

    # 签名交易
    signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)

    # 发送交易
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)

    # 等待交易完成
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    # 保存合约地址
    with open("contract_address.txt", "w") as file:
        file.write(tx_receipt.contractAddress)

    return tx_receipt.contractAddress, abi


# test.py
from web3 import Web3
from eth_account import Account
import json
import os


def test_contract():
    # 连接到私有链
    w3 = Web3(Web3.HTTPProvider('http://47.128.241.199:8545'))

    # 读取合约地址和 ABI
    with open("contract_address.txt", "r") as file:
        contract_address = file.read().strip()

    with open("compiled_code.json", "r") as file:
        compiled_sol = json.load(file)
        abi = compiled_sol["contracts"]["test.sol"]["SimpleStorage"]["abi"]

    # 创建合约实例
    contract = w3.eth.contract(address=contract_address, abi=abi)

    # 获取账户
    private_key = os.getenv('ETH_PRIVATE_KEY', 'your-private-key-here')  # 请替换为实际的私钥
    account = Account.from_key(private_key)

    # 测试 set 函数
    def test_set(value):
        nonce = w3.eth.get_transaction_count(account.address)

        # 构建交易
        transaction = contract.functions.set(value).build_transaction({
            "chainId": 66633666,
            "gasPrice": w3.eth.gas_price,
            "from": account.address,
            "nonce": nonce,
        })

        # 签名并发送交易
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)

        # 等待交易完成
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_receipt

    # 测试 get 函数
    def test_get():
        return contract.functions.get().call()

    # 运行测试
    print("Testing contract functions...")

    # 测试设置值
    print("Setting value to 42...")
    test_set(42)

    # 测试获取值
    value = test_get()
    print(f"Retrieved value: {value}")

    # 验证结果
    assert value == 42, f"Expected 42 but got {value}"
    print("Test completed successfully!")


# main.py
if __name__ == "__main__":
    # 1. 编译合约
    print("Compiling contract...")
    compile_contract()

    # 2. 部署合约
    print("Deploying contract...")
    contract_address, abi = deploy_contract()
    print(f"Contract deployed at: {contract_address}")

    # 3. 测试合约
    print("Testing contract...")
    test_contract()