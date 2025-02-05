// server.js
const express = require('express');
const path = require('path');
const {ethers} = require('ethers');
const fs = require('fs');
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json');
const INonfungiblePositionManager = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load configuration
const CONFIG = JSON.parse(fs.readFileSync('state.json', 'utf8'));
const provider = new ethers.providers.JsonRpcProvider(CONFIG.PROVIDER_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get token balances
app.get('/api/balances', async (req, res) => {
    try {
        const token0 = new ethers.Contract(CONFIG.TOKEN_A, IERC20.abi, wallet);
        const token1 = new ethers.Contract(CONFIG.TOKEN_B, IERC20.abi, wallet);

        const balance0 = await token0.balanceOf(wallet.address);
        const balance1 = await token1.balanceOf(wallet.address);

        res.json({
            token0Balance: ethers.utils.formatEther(balance0),
            token1Balance: ethers.utils.formatEther(balance1),
            address: wallet.address
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Add liquidity endpoint
app.post('/api/addLiquidity', async (req, res) => {
    try {
        const {amount0, amount1} = req.body;

        const positionManager = new ethers.Contract(
            CONFIG.nonfungibleTokenPositionManagerAddress,
            INonfungiblePositionManager.abi,
            wallet
        );

        // Approve tokens
        const token0 = new ethers.Contract(CONFIG.TOKEN_A, IERC20.abi, wallet);

        const token1 = new ethers.Contract(CONFIG.TOKEN_B, IERC20.abi, wallet);

        await token0.approve(CONFIG.nonfungibleTokenPositionManagerAddress,
            ethers.utils.parseEther(amount0));
        await delay(5000);
        await token1.approve(CONFIG.nonfungibleTokenPositionManagerAddress,
            ethers.utils.parseEther(amount1));
        await delay(5000);

        const mintParams = {
            token0: CONFIG.TOKEN0,
            token1: CONFIG.TOKEN1,
            fee: CONFIG.FEE_TIER,
            tickLower: -887220,
            tickUpper: 887220,
            amount0Desired: ethers.utils.parseEther("10"),
            amount1Desired: ethers.utils.parseEther("10"),
            amount0Min: 0,
            amount1Min: 0,
            recipient: wallet.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20
        };

        console.log("Adding liquidity with params:", mintParams);
        const tx = await positionManager.mint(mintParams, {
            gasLimit: ethers.utils.hexlify(5000000)
        });


        const receipt = await tx.wait();
        res.json({
            success: true,
            txHash: receipt.transactionHash
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Swap endpoint
app.post('/api/swap', async (req, res) => {
    try {
        const {tokenIn, amount} = req.body;

        const SWAP_ROUTER_ABI = [
            "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
        ];

        const router = new ethers.Contract(CONFIG.swapRouter02, SWAP_ROUTER_ABI, wallet);
        const amountIn = ethers.utils.parseEther(amount);

        const tokenInAddress = tokenIn === 'token0' ? CONFIG.TOKEN_A : CONFIG.TOKEN_B;
        const tokenOutAddress = tokenIn === 'token0' ? CONFIG.TOKEN_B : CONFIG.TOKEN_A;

        // Approve token
        const token = new ethers.Contract(tokenInAddress, IERC20.abi, wallet);
        await token.approve(CONFIG.swapRouter02, amountIn);

        const params = {
            tokenIn: tokenInAddress,
            tokenOut: tokenOutAddress,
            fee: CONFIG.FEE_TIER,
            recipient: wallet.address,
            amountIn: amountIn,
            amountOutMinimum: ethers.constants.Zero,
            sqrtPriceLimitX96: ethers.constants.Zero
        };

        const tx = await router.exactInputSingle(params, {
            gasLimit: ethers.utils.hexlify(1000000)
        });

        const receipt = await tx.wait();
        res.json({
            success: true,
            txHash: receipt.transactionHash
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Remove liquidity endpoint
app.post('/api/removeLiquidity', async (req, res) => {
    try {
        const {tokenId, percentage} = req.body;

        const positionManager = new ethers.Contract(
            CONFIG.nonfungibleTokenPositionManagerAddress,
            [
                "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
                "function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline) params) external payable returns (uint256 amount0, uint256 amount1)",
                "function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max) params) external payable returns (uint256 amount0, uint256 amount1)"
            ],
            wallet
        );

        // Get position info
        const position = await positionManager.positions(tokenId);
        const liquidityToRemove = position.liquidity.mul(ethers.BigNumber.from(percentage)).div(100);

        // Remove liquidity
        const decreaseParams = {
            tokenId: tokenId,
            liquidity: liquidityToRemove,
            amount0Min: 0,
            amount1Min: 0,
            deadline: Math.floor(Date.now() / 1000) + 1800
        };

        const removeTx = await positionManager.decreaseLiquidity(decreaseParams, {
            gasLimit: ethers.utils.hexlify(1000000)
        });
        await removeTx.wait();

        // Collect tokens
        const collectParams = {
            tokenId: tokenId,
            recipient: wallet.address,
            amount0Max: ethers.constants.MaxUint256,
            amount1Max: ethers.constants.MaxUint256
        };

        const collectTx = await positionManager.collect(collectParams, {
            gasLimit: ethers.utils.hexlify(500000)
        });
        const receipt = await collectTx.wait();

        res.json({
            success: true,
            txHash: receipt.transactionHash
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});