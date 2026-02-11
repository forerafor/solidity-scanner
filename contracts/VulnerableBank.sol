// contracts/VulnerableBank.sol
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be positive");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    // ❌ ثغرة Reentrancy - إرسال الأموال قبل تحديث الرصيد
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // خطأ: إرسال الأموال أولاً
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // خطأ: تحديث الرصيد لاحقاً
        balances[msg.sender] -= amount;
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
