// Deploys HoneyBatch and grants BEEKEEPER_ROLE to the deployer so the backend can mint.
// Usage: npx hardhat run scripts/deploy.js --network sepolia
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying HoneyBatch from ${deployer.address}`);

  const HoneyBatch = await hre.ethers.getContractFactory("HoneyBatch");
  const contract = await HoneyBatch.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`HoneyBatch deployed at ${address}`);

  const tx = await contract.grantRole(await contract.BEEKEEPER_ROLE(), deployer.address);
  await tx.wait();
  console.log("Granted BEEKEEPER_ROLE to deployer (backend signer).");
  console.log(`\nSet in .env:\nCONTRACT_ADDRESS=${address}\nBLOCKCHAIN_MODE=sepolia`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
