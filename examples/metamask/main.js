

const IAxelarGateway = await fetch('abi/IAxelarGateway.json').then((chain) => {
    return chain.json();
});
const IERC20 = await fetch('abi/IERC20.json').then((chain) => {
    return chain.json();
});

const IERC4626 = await fetch('abi/IERC4626.json').then((chain) => {
    return chain.json();
});

const SampleStrategy = await fetch('abi/SampleStrategy.json').then((chain) => {
    return chain.json();
});

const chain1 = await fetch('chain1.json').then((chain) => {
    return chain.json();
});
const chain2 = await fetch('chain2.json').then((chain) => {
    return chain.json();
});
const deployInfo = await fetch('deployInfo.json').then((chain) => {
    return chain.json();
});
const chains = [chain1, chain2];
const getChain = (name) => {
    return chains.find(chain => name === chain.name);
}
const getOtherChain = (name) => {
    return chains.find(chain => name !== chain.name);
}
let chain;
let otherChain;
let gateway;
let provider;
let ust;
let vault;
let st1;
let st2;
// let user1;
// let user2;
const gasLimit = 11473448;
const gasPrice = new ethers.BigNumber.from("20000000000");

async function selectChain(e) {
    let element = e.target;
    let value = element.options[element.selectedIndex].text;
    console.log(value);
    chain = getChain(value);
    otherChain = getOtherChain(value);
    await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{
            chainId: "0x" + chain.chainId.toString(16),
        }]
    });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    gateway = new ethers.Contract(chain.gatewayAddress, IAxelarGateway.abi, provider);
    const ustAddress = await gateway.tokenAddresses('UST');
    ust = new ethers.Contract(ustAddress, IERC20.abi, provider);

    if (value == "Chain 1") {
        console.log("retrieving chain1 contracts");
        vault = new ethers.Contract(deployInfo.vault, IERC4626.abi, provider);
        st1 = new ethers.Contract(deployInfo.strat1, SampleStrategy.abi, provider);
        // user1 = new ethers.Wallet("0x7f47466019ec556ec0b36b3c9033b41b34a6b98f108b0ff60f89e012f7cd1873", provider);
        let stratValue = await st1.value();
        if (stratValue == null){
            document.getElementById('value-strat1').value = 0;
        } else {
            document.getElementById('value-strat1').value = stratValue;
        }
        console.log("contracts retrieved");
    } else {
        console.log("retrieving chain2 contracts");
        st2 = new ethers.Contract(deployInfo.strat2, SampleStrategy.abi, provider);
        // user2 = new ethers.Wallet("0x7f47466019ec556ec0b36b3c9033b41b34a6b98f108b0ff60f89e012f7cd1873", provider);

        let stratValue = await st2.value();
        if (stratValue == null){
            document.getElementById('value-strat2').value = 0;
        } else {
            document.getElementById('value-strat2').value = stratValue;
        }
    }

}

let scroll = document.getElementById('chain');
for (let chain of chains) {
    let option = document.createElement('option');
    option.innerHTML = chain.name;
    scroll.appendChild(option);
}
scroll.addEventListener('change', selectChain);

selectChain({
    target:
        document.getElementById('chain')
})


async function approve() {
    let amountIn = document.getElementById('amountIn').value;

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner();
    console.log(gateway.address, amountIn);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    console.log(account);
    // console.log(await ust.allowance(account, gateway.address));
    await (await ust.connect(signer).approve(gateway.address, amountIn)).wait();
    console.log(await ust.allowance(account, gateway.address));

}

const approveButton = document.getElementById('approve');
approveButton.addEventListener('click', approve);

async function send() {
    let destinationAddress = document.getElementById('destinationAddress').value;
    if (!ethers.utils.isAddress(destinationAddress)) {
        alert('Please enter a valid address');
        return;
    }
    destinationAddress = ethers.utils.getAddress(destinationAddress);

    let amountIn = document.getElementById('amountIn').value;
    // amountIn = BigInt(amountIn * 1e6);

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner();
    await (await gateway.connect(signer).sendToken(otherChain.name, destinationAddress, 'UST', amountIn)).wait();

}

const sendButton = document.getElementById('send');
sendButton.addEventListener('click', send);

async function track() {
    await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
            type: 'ERC20',
            options: {
                address: ust.address,
                symbol: 'UST',
                decimals: 6,
            },
        },
    });

}

const trackButton = document.getElementById('track');
trackButton.addEventListener('click', track);

async function auto() {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    document.getElementById('destinationAddress').value = accounts[0];
}

const approveVaultButton = document.getElementById('approve-vault');
approveVaultButton.addEventListener('click', approveVault);

async function approveVault() {
    console.log("vault approval started");
    // const gasLimit = 21473448;
    // const gasPrice = new ethers.BigNumber.from("30000000000");
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner();
    // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    // const account = accounts[0];

    await(await ust.connect(signer).approve(vault.address, document.getElementById('deposit-amount').value)).wait();
    console.log("vault approval successful");
}

const depositVaultButton = await document.getElementById('deposit-vault');
depositVaultButton.addEventListener('click', depositVault);

async function depositVault() {
    
    const signer = provider.getSigner();
    await(await vault.connect(signer).deposit(document.getElementById('deposit-amount').value, vault.address, { gasLimit:gasLimit, gasPrice: gasPrice})).wait();
    console.log("vault deposit successful");
}

const sendValueButton1 = await document.getElementById('send-value-strat1');
sendValueButton1.addEventListener('click', sendValue1);

async function sendValue1() {
    console.log("sending initiated");
    const signer = provider.getSigner();
    const value = document.getElementById('value-strat1').value;
    console.log(value);
    
    await (await st1.connect(signer).set(chain2.name, value, {value: gasLimit * 1})).wait();
    console.log("sending concluded");
}

const sendValueButton2 = await document.getElementById('send-value-strat2');
sendValueButton2.addEventListener('click', sendValue2);

async function sendValue2() {
    console.log("sending initiated");
    const signer = provider.getSigner();
    const value = document.getElementById('value-strat2').value;
    console.log(value);
    
    await (await st2.connect(signer).set(chain1.name, value, {value: gasLimit * 1})).wait();
    console.log("sending concluded");
}

const autoButton = document.getElementById('auto');
autoButton.addEventListener('click', auto);

setInterval(async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    let amountIn = document.getElementById('amountIn').value;
    
    
    // amountIn = BigInt(amountIn * 1e6);
    const allowance = await ust.allowance(account, gateway.address);

    if (allowance >= amountIn) {
        approveButton.disabled = true;
        sendButton.disabled = false;
    } else {
        approveButton.disabled = false;
        sendButton.disabled = true;
    }

    // provider = new ethers.providers.Web3Provider(window.ethereum);
    // gateway = new ethers.Contract(chain.gatewayAddress, IAxelarGateway.abi, provider);
    const ustAddress = await gateway.tokenAddresses('UST');
    // ust = new ethers.Contract(ustAddress, IERC20.abi, provider);
    var ustVal = await ust.balanceOf(account);
    if (ustAddress == chain1.ustAddress){
        document.getElementById('chain1').style.backgroundColor = "rgba(255, 255, 255, 1)";
        document.getElementById('chain2').style.backgroundColor = "rgba(255, 0, 0, 0.2)";
        document.getElementById('balance-user1').disabled = false;
        document.getElementById('deposit-amount').disabled = false;
        document.getElementById('balance-vault').disabled = false;
        document.getElementById('balance-strat1').disabled = false;
        document.getElementById('value-strat1').disabled = false;
        document.getElementById('send-value-strat1').disabled = false;
        document.getElementById('balance-user2').disabled = true;
        document.getElementById('balance-strat2').disabled = true;
        document.getElementById('value-strat2').disabled = true;
        document.getElementById('send-value-strat2').disabled = true;
        document.getElementById('balance-user1').value = ustVal;

        let vaultAmountIn = document.getElementById('deposit-amount').value;
        // amountIn = BigInt(amountIn * 1e6);
        const vaultAllowance = await ust.allowance(account, vault.address);
    
        if (vaultAllowance >= vaultAmountIn) {
            approveVaultButton.disabled = true;
            depositVaultButton.disabled = false;
        } else {
            approveVaultButton.disabled = false;
            depositVaultButton.disabled = true;
        }        

        let vaultBal = await ust.balanceOf(deployInfo.vault);
        if (vaultBal == null){
            document.getElementById('balance-vault').value = 0;
        } else {
            document.getElementById('balance-vault').value = vaultBal;
        }
        let stratBal = await ust.balanceOf(deployInfo.strat1);
        if (stratBal == null){
            document.getElementById('balance-strat1').value = 0;
        } else {
            document.getElementById('balance-strat1').value = stratBal;
        }     
    } else {
        document.getElementById('chain1').style.backgroundColor = "rgba(255, 0, 0, 0.2)";
        document.getElementById('chain2').style.backgroundColor = "rgba(255, 255, 255, 1)";
        document.getElementById('balance-user1').disabled = true;
        document.getElementById('deposit-amount').disabled = true;
        document.getElementById('balance-vault').disabled = true;
        document.getElementById('approve-vault').disabled = true;
        document.getElementById('deposit-vault').disabled = true;
        document.getElementById('balance-strat1').disabled = true;
        document.getElementById('value-strat1').disabled = true;
        document.getElementById('send-value-strat1').disabled = true;
        document.getElementById('balance-user2').disabled = false;
        document.getElementById('balance-strat2').disabled = false;
        document.getElementById('value-strat2').disabled = false;
        document.getElementById('send-value-strat2').disabled = false;
        document.getElementById('balance-user2').value = ustVal;

        let stratBal = await ust.balanceOf(deployInfo.strat2);
        if (stratBal == null){
            document.getElementById('balance-strat2').value = 0;
        } else {
            document.getElementById('balance-strat2').value = stratBal;
        }
    }
}, 1000);
