// contracts/VulnerableToken.sol
pragma solidity ^0.7.0; // ❌ إصدار قديم بدون حماية

contract VulnerableToken {
    string public name = "Vulnerable Token";
    string public symbol = "VULN";
    uint8 public decimals = 18;
    
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    
    constructor() {
        totalSupply = 2**256 - 1; // الحد الأقصى
    }
    
    // ❌ ثغرة Underflow
    function transfer(address to, uint256 amount) public {
        require(to != address(0), "Invalid address");
        
        // 0 - 1 = 2**256 - 1 (تحت الصفر)
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    // ❌ ثغرة Overflow
    function mint(uint256 amount) public {
        // (2**256 - 1) + 1 = 0
        totalSupply += amount;
        balances[msg.sender] += amount;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}
