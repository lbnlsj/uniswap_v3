// Configuration
const CONFIG = {
    FACTORY_ADDRESS: '0x97d5A7D9DBE294C2744e95ABaE9A050144Cd840C',
    ROUTER_ADDRESS: '0xb727597854991c15147e8Fe2108F5f6634351e61',
    POSITION_MANAGER_ADDRESS: '0x19884434058f305045e71cE4b57c4460c481bE87',
    FEE_TIER: 3000
};

// TestToken Contract ABI and Bytecode
const TEST_TOKEN_ABI = [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "symbol",
          "type": "string"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
];

const TEST_TOKEN_BYTECODE = '608060405234801561001057600080fd5b506040516105e53803806105e583398101604081905261002f91610087565b8151610042906000906020850190610049565b50506100ff565b828054610055906100c4565b90600052602060002090601f01602090048101928261007757600085556100bd565b82601f1061009057805160ff19168380011785556100bd565b828001600101855582156100bd579182015b828111156100bd5782518255916020019190600101906100a2565b506100c9929150610139565b5090565b600181811c908216806100d857607f821691505b6020821081036100f857634e487b7160e01b600052602260045260246000fd5b50919050565b6104d78061010e6000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806306fdde031461006757806318160ddd14610085578063313ce567146100975780635c658165146100a657806370a08231146100e657806395d89b4114610105575b600080fd5b61006f61010d565b60405161007c91906102c7565b60405180910390f35b61008e60025481565b60405190815260200161007c565b61008e610100600052600460205260009081526040902054815600';

// Other contract ABIs
const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

const FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)"
];

const POSITION_MANAGER_ABI = [
    "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
    "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
    "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external returns (uint256 amount0, uint256 amount1)",
    "function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external returns (uint256 amount0, uint256 amount1)"
];

const POOL_ABI = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)"
];

const TOKEN_BYTECODE = '608060405234801561001057600080fd5b506040516105e53803806105e583398101604081905261002f91610087565b8151610042906000906020850190610049565b50506100ff565b828054610055906100c4565b90600052602060002090601f01602090048101928261007757600085556100bd565b82601f1061009057805160ff19168380011785556100bd565b828001600101855582156100bd579182015b828111156100bd5782518255916020019190600101906100a2565b506100c9929150610139565b5090565b600181811c908216806100d857607f821691505b6020821081036100f857634e487b7160e01b600052602260045260246000fd5b50919050565b6104d78061010e6000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806306fdde031461006757806318160ddd14610085578063313ce567146100975780635c658165146100a657806370a08231146100e657806395d89b4114610105575b600080fd5b61006f61010d565b60405161007c91906102c7565b60405180910390f35b61008e60025481565b60405190815260200161007c565b61008e610100600052600460205260009081526040902054815600';

class UniswapInterface {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.factory = null;
        this.router = null;
        this.positionManager = null;
        this.connected = false;
        this.transactionHistory = [];
    }

    async initialize() {
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                this.provider = new ethers.providers.Web3Provider(window.ethereum);
                this.signer = this.provider.getSigner();

                // Initialize contracts
                this.factory = new ethers.Contract(CONFIG.FACTORY_ADDRESS, FACTORY_ABI, this.signer);
                this.positionManager = new ethers.Contract(CONFIG.POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, this.signer);

                this.connected = true;
                this.updateWalletStatus();
                this.showStatus('Wallet connected successfully', 'success');
            } catch (error) {
                this.showStatus('Failed to connect wallet: ' + error.message, 'error');
            }
        } else {
            this.showStatus('Please install MetaMask or TrustWallet', 'error');
        }
    }

    async createToken(name, symbol) {
        try {
            this.showStatus('Deploying token contract...', 'info');

            // Create a contract factory for the TestToken
            const factory = new ethers.ContractFactory(
                TEST_TOKEN_ABI,
                TEST_TOKEN_BYTECODE,
                this.signer
            );

            // Prepare deployment transaction with explicit gas settings
            const deploymentTransaction = factory.getDeployTransaction(name, symbol);

            // Deploy with explicit gas limit
            const token = await factory.deploy(name, symbol, {
                gasLimit: 300000000  // Fixed gas limit that should be sufficient for deployment
            });

            this.showStatus('Token contract deployment in progress...', 'info');

            // Wait for deployment to complete
            await token.deployed();

            // Add deployment to history and show success message
            this.addToHistory('Token Creation', `Created token ${name} (${symbol}) at ${token.address}`);
            this.showStatus(`Token created successfully at ${token.address}. Address: ${token.address}`, 'success');

            // Update the token address input fields automatically
            const tokenAInput = document.getElementById('tokenAAddress');
            if (!tokenAInput.value) {
                tokenAInput.value = token.address;
            } else {
                document.getElementById('tokenBAddress').value = token.address;
            }

            return token.address;
        } catch (error) {
            console.error('Token deployment error:', error);
            this.showStatus('Failed to create token: ' + error.message, 'error');
        }
    }

    async addLiquidity(tokenA, tokenB, amountA, amountB) {
        try {
            // Ensure tokens are in the correct order
            if (tokenA.toLowerCase() > tokenB.toLowerCase()) {
                [tokenA, tokenB] = [tokenB, tokenA];
                [amountA, amountB] = [amountB, amountA];
            }

            // Convert amounts to Wei
            const amount0Desired = ethers.utils.parseEther(amountA.toString());
            const amount1Desired = ethers.utils.parseEther(amountB.toString());

            // Approve tokens
            const token0 = new ethers.Contract(tokenA, ERC20_ABI, this.signer);
            const token1 = new ethers.Contract(tokenB, ERC20_ABI, this.signer);

            await token0.approve(CONFIG.POSITION_MANAGER_ADDRESS, amount0Desired);
            await token1.approve(CONFIG.POSITION_MANAGER_ADDRESS, amount1Desired);

            // Prepare parameters for minting position
            const params = {
                token0: tokenA,
                token1: tokenB,
                fee: CONFIG.FEE_TIER,
                tickLower: -887220,  // Example ticks for full range
                tickUpper: 887220,
                amount0Desired,
                amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: await this.signer.getAddress(),
                deadline: Math.floor(Date.now() / 1000) + 1200
            };

            // Create position
            const tx = await this.positionManager.mint(params);
            const receipt = await tx.wait();

            this.addToHistory('Add Liquidity', `Added liquidity for ${tokenA} and ${tokenB}`);
            this.showStatus('Liquidity added successfully', 'success');

            return receipt;
        } catch (error) {
            this.showStatus('Failed to add liquidity: ' + error.message, 'error');
            throw error;
        }
    }

    async swap(tokenIn, tokenOut, amountIn) {
        try {
            const ROUTER_ABI = ["function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)"];
            const router = new ethers.Contract(CONFIG.ROUTER_ADDRESS, ROUTER_ABI, this.signer);

            // Convert amount to Wei
            const amountInWei = ethers.utils.parseEther(amountIn.toString());

            // Approve token
            const token = new ethers.Contract(tokenIn, ERC20_ABI, this.signer);
            await token.approve(CONFIG.ROUTER_ADDRESS, amountInWei);

            const params = {
                tokenIn,
                tokenOut,
                fee: CONFIG.FEE_TIER,
                recipient: await this.signer.getAddress(),
                amountIn: amountInWei,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            };

            const tx = await router.exactInputSingle(params);
            const receipt = await tx.wait();

            this.addToHistory('Swap', `Swapped ${amountIn} tokens from ${tokenIn} to ${tokenOut}`);
            this.showStatus('Swap completed successfully', 'success');

            return receipt;
        } catch (error) {
            this.showStatus('Failed to swap tokens: ' + error.message, 'error');
            throw error;
        }
    }

    async removeLiquidity(tokenId, percentage) {
        try {
            // Get position info
            const position = await this.positionManager.positions(tokenId);

            // Calculate liquidity to remove
            const liquidityToRemove = position.liquidity.mul(ethers.BigNumber.from(percentage)).div(100);

            const params = {
                tokenId,
                liquidity: liquidityToRemove,
                amount0Min: 0,
                amount1Min: 0,
                deadline: Math.floor(Date.now() / 1000) + 1200
            };

            // Remove liquidity
            const tx = await this.positionManager.decreaseLiquidity(params);
            await tx.wait();

            // Collect tokens
            const collectParams = {
                tokenId,
                recipient: await this.signer.getAddress(),
                amount0Max: ethers.constants.MaxUint256,
                amount1Max: ethers.constants.MaxUint256
            };

            const collectTx = await this.positionManager.collect(collectParams);
            const receipt = await collectTx.wait();

            this.addToHistory('Remove Liquidity', `Removed ${percentage}% liquidity from position ${tokenId}`);
            this.showStatus('Liquidity removed successfully', 'success');

            return receipt;
        } catch (error) {
            this.showStatus('Failed to remove liquidity: ' + error.message, 'error');
            throw error;
        }
    }

    async queryPool(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, POOL_ABI, this.provider);
            const [slot0, liquidity] = await Promise.all([
                pool.slot0(),
                pool.liquidity()
            ]);

            const poolInfo = {
                sqrtPrice: slot0.sqrtPriceX96.toString(),
                tick: slot0.tick,
                liquidity: liquidity.toString(),
                unlocked: slot0.unlocked
            };

            this.addToHistory('Pool Query', `Queried pool ${poolAddress}`);
            this.showStatus('Pool query successful', 'success');

            return poolInfo;
        } catch (error) {
            this.showStatus('Failed to query pool: ' + error.message, 'error');
            throw error;
        }
    }

    // Utility functions
    async updateWalletStatus() {
        const address = await this.signer.getAddress();
        document.getElementById('walletStatus').textContent =
            `Connected: ${address.substring(0, 6)}...${address.substring(38)}`;
    }

    addToHistory(type, description) {
        const timestamp = new Date().toLocaleString();
        this.transactionHistory.unshift({ type, description, timestamp });
        this.updateTransactionHistory();
    }

    updateTransactionHistory() {
        const historyElement = document.getElementById('transactionHistory');
        historyElement.innerHTML = this.transactionHistory
            .map(tx => `
                <div class="bg-gray-50 p-3 rounded">
                    <div class="font-semibold">${tx.type}</div>
                    <div class="text-sm text-gray-600">${tx.description}</div>
                    <div class="text-xs text-gray-500">${tx.timestamp}</div>
                </div>
            `)
            .join('');
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        const backgroundColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';

        statusElement.innerHTML = `
            <div class="${backgroundColor} text-white px-4 py-2 rounded shadow-lg">
                ${message}
            </div>
        `;

        setTimeout(() => {
            statusElement.innerHTML = '';
        }, 5000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const uniswap = new UniswapInterface();

    // Connect wallet
    document.getElementById('connectWallet').addEventListener('click', () => {
        uniswap.initialize();
    });

    // Create token
    document.getElementById('createToken').addEventListener('click', async () => {
        const name = document.getElementById('tokenName').value;
        const symbol = document.getElementById('tokenSymbol').value;
        await uniswap.createToken(name, symbol);
    });

    // Add liquidity
    document.getElementById('addLiquidity').addEventListener('click', async () => {
        const tokenA = document.getElementById('tokenAAddress').value;
        const tokenB = document.getElementById('tokenBAddress').value;
        const amountA = document.getElementById('tokenAAmount').value;
        const amountB = document.getElementById('tokenBAmount').value;
        await uniswap.addLiquidity(tokenA, tokenB, amountA, amountB);
    });

    // Swap tokens
    document.getElementById('swap').addEventListener('click', async () => {
        const tokenIn = document.getElementById('tokenInAddress').value;
        const tokenOut = document.getElementById('tokenOutAddress').value;
        const amountIn = document.getElementById('amountIn').value;
        await uniswap.swap(tokenIn, tokenOut, amountIn);
    });

    // Remove liquidity
    document.getElementById('removeLiquidity').addEventListener('click', async () => {
        const positionId = document.getElementById('positionId').value;
        const percentage = document.getElementById('removePercentage').value;
        await uniswap.removeLiquidity(positionId, percentage);
    });

    // Query pool
    document.getElementById('queryPool').addEventListener('click', async () => {
        const poolAddress = document.getElementById('poolAddress').value;
        const poolInfo = await uniswap.queryPool(poolAddress);
        document.getElementById('poolInfo').innerHTML = `
            <div class="space-y-2">
                <div><strong>Square Root Price:</strong> ${poolInfo.sqrtPrice}</div>
                <div><strong>Tick:</strong> ${poolInfo.tick}</div>
                <div><strong>Liquidity:</strong> ${poolInfo.liquidity}</div>
                <div><strong>Status:</strong> ${poolInfo.unlocked ? 'Unlocked' : 'Locked'}</div>
            </div>
        `;
    });
});