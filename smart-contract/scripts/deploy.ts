import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "testnet",
});

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  const LinkUp = await ethers.getContractFactory("LinkUp", deployer);
  const contract = await LinkUp.deploy(deployer.address, 200);

  await contract.waitForDeployment();

  const linkupAddress = await contract.getAddress();
  console.log("LinkUp contract deployed at:", linkupAddress);
  
  // Verify the deployment
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  
  // Get platform fee
  const platformFee = await contract.platformFeeBps();
  console.log("Platform fee (bps):", platformFee);
  console.log("Platform fee (percentage):", (Number(platformFee) / 100.0).toString() + "%");


  const ReceiptNft = await ethers.getContractFactory("ReceiptNFT", deployer);
  const receiptContract = await ReceiptNft.deploy(linkupAddress);
  
  await receiptContract.waitForDeployment();
  
  const receiptAddress = await receiptContract.getAddress();
  console.log("ReceiptNft contract deployed at:", receiptAddress);

  const tx = await contract.setReceiptNft(receiptAddress);
  await tx.wait();
  console.log("Linked ReceiptNft to LinkUp");
  

  console.log("Deployment complete!");
}

main().catch(console.error);
