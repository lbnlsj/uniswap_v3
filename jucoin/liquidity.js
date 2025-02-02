const {ethers} = require("ethers");
const IUniswapV3Factory = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json");
const IUniswapV3Pool = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const INonfungiblePositionManager = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json");
const IERC20 = require("@openzeppelin/contracts/build/contracts/IERC20.json");
const fs = require('fs');
const path = require('path');

// Load configuration from config.json
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'state.json');
        const configFile = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configFile);
    } catch (error) {
        console.error('Error loading config.json:', error);
        process.exit(1);
    }
}

// Initialize configuration
const CONFIG = loadConfig();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const provider = new ethers.providers.JsonRpcProvider(CONFIG.PROVIDER_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

// 确保 token0 地址小于 token1 地址
const [TOKEN0, TOKEN1] = ethers.BigNumber.from(CONFIG.TOKEN_A).lt(CONFIG.TOKEN_B)
    ? [CONFIG.TOKEN_A, CONFIG.TOKEN_B]
    : [CONFIG.TOKEN_B, CONFIG.TOKEN_A];

async function approveToken(tokenAddress, spender, amount) {
    const token = new ethers.Contract(tokenAddress, IERC20.abi, wallet);
    console.log(`Approving ${spender} to spend ${tokenAddress}`);
    const tx = await token.approve(spender, amount);
    await tx.wait();
    console.log(`Approval confirmed for ${tokenAddress}`);
}

async function checkAndCreatePool() {
    // const factory = new ethers.Contract(CONFIG.v3CoreFactoryAddress, IUniswapV3Factory.abi, wallet);
    const factory = new ethers.Contract(CONFIG.v3CoreFactoryAddress, IUniswapV3Factory.abi, wallet);

    // 检查池子是否存在
    let poolAddress = await factory.getPool(TOKEN0, TOKEN1, CONFIG.FEE_TIER);

    if (poolAddress === ethers.constants.AddressZero) {
        console.log("Creating new pool...");
        const tx = await factory.createPool(TOKEN0, TOKEN1, CONFIG.FEE_TIER);
        await tx.wait();
        poolAddress = await factory.getPool(TOKEN0, TOKEN1, CONFIG.FEE_TIER);
        console.log("Pool created at:", poolAddress);
    } else {
        console.log("Pool already exists at:", poolAddress);
    }

    // 检查池子是否已初始化
    const pool = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, wallet);
    const slot0 = await pool.slot0();

    // 检查 sqrtPriceX96 是否为 0
    if (slot0.sqrtPriceX96.eq(0)) {
        console.log("Pool exists but not initialized. Initializing now...");
        // 设置初始价格为 1:1
        const initialPrice = ethers.BigNumber.from(2).pow(96); // 1:1 价格的 sqrtPriceX96
        const tx = await pool.initialize(initialPrice);
        await tx.wait();
        console.log("Pool initialized with 1:1 price ratio");
    } else {
        console.log("Pool already initialized with sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    }

    return poolAddress;
}

async function addLiquidity() {
    const positionManager = new ethers.Contract(
        CONFIG.nonfungibleTokenPositionManagerAddress,
        INonfungiblePositionManager.abi,
        wallet
    );

    // Approve tokens
    const amount = ethers.utils.parseEther("1000");
    await approveToken(TOKEN0, CONFIG.nonfungibleTokenPositionManagerAddress, amount);
    await delay(5000);
    await approveToken(TOKEN1, CONFIG.nonfungibleTokenPositionManagerAddress, amount);
    await delay(5000);

    const mintParams = {
        token0: TOKEN0,
        token1: TOKEN1,
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
    console.log("Liquidity added, transaction:", receipt.transactionHash);
}

async function main() {
    try {
        console.log("Starting deployment process...");
        console.log("Token0:", TOKEN0);
        console.log("Token1:", TOKEN1);

        await checkAndCreatePool();
        console.log("\nAdding initial liquidity...");
        await addLiquidity();

        console.log("\nProcess completed successfully!");
    } catch (error) {
        console.error("Error:", error);
        if (error.error) {
            console.error("Error details:", error.error);
        }
        if (error.receipt) {
            console.error("Transaction receipt:", error.receipt);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });