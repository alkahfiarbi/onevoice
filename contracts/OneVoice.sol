// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title OneVoice — one Agent ID, one vote.
/// @notice On-chain polls where every voter must hold a Binance Agent ID (.ai).
/// An Agent ID is non-transferable and one per person, so "one vote per
/// holder" is sybil-resistant by construction: a person cannot vote twice by
/// splitting across wallets, because each person can only ever hold one
/// Agent ID.
///
/// No owner, no admin, no fees, no custody, no upgradeability. The contract
/// only records votes. Anyone holding an Agent ID can create a poll and vote.
/// There is no trading, no token, and no promise of returns.
///
/// Agent ID is used in two places:
///  1. Access control — createPoll() and vote() both require
///     AgentID.balanceOf(msg.sender) > 0.
///  2. Identity — poll creators and voters are identified by their Agent ID
///     (the frontend reverse-resolves each address to its .ai name).
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
}

contract OneVoice {
    /// @notice SPACE ID Agent ID contract on BNB Chain (ERC-721, non-transferable).
    IAgentID public immutable AGENT_ID;

    struct Poll {
        string question;
        string[] options;
        uint256[] votes;
        uint256 endsAt;
        address creator;
    }

    Poll[] private _polls;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event PollCreated(uint256 indexed pollId, address indexed creator, string question, uint256 endsAt);
    event Voted(uint256 indexed pollId, address indexed voter, uint256 option);

    /// @param agentId Address of the Agent ID contract (0x60b9262456de011f7d15a54cdd8c48baaa8b022f on BNB Chain mainnet).
    constructor(address agentId) {
        require(agentId != address(0), "OneVoice: bad Agent ID address");
        AGENT_ID = IAgentID(agentId);
    }

    modifier onlyAgentID() {
        require(AGENT_ID.balanceOf(msg.sender) > 0, "OneVoice: Agent ID required");
        _;
    }

    /// @notice Create a poll. Only Agent ID holders can create polls.
    /// @param question The question (1-200 chars).
    /// @param options 2-8 options, each 1-80 chars.
    /// @param durationSeconds How long voting stays open (1 hour - 30 days).
    function createPoll(
        string calldata question,
        string[] calldata options,
        uint256 durationSeconds
    ) external onlyAgentID returns (uint256 pollId) {
        require(bytes(question).length > 0 && bytes(question).length <= 200, "OneVoice: bad question");
        require(options.length >= 2 && options.length <= 8, "OneVoice: 2-8 options");
        for (uint256 i = 0; i < options.length; i++) {
            require(bytes(options[i]).length > 0 && bytes(options[i]).length <= 80, "OneVoice: bad option");
        }
        require(durationSeconds >= 1 hours && durationSeconds <= 30 days, "OneVoice: bad duration");

        pollId = _polls.length;
        Poll storage p = _polls.push();
        p.question = question;
        p.endsAt = block.timestamp + durationSeconds;
        p.creator = msg.sender;
        for (uint256 i = 0; i < options.length; i++) {
            p.options.push(options[i]);
            p.votes.push(0);
        }
        emit PollCreated(pollId, msg.sender, question, p.endsAt);
    }

    /// @notice Vote on a poll. One vote per Agent ID holder per poll.
    function vote(uint256 pollId, uint256 option) external onlyAgentID {
        require(pollId < _polls.length, "OneVoice: no such poll");
        Poll storage p = _polls[pollId];
        require(block.timestamp < p.endsAt, "OneVoice: poll ended");
        require(option < p.options.length, "OneVoice: bad option");
        require(!hasVoted[pollId][msg.sender], "OneVoice: already voted");
        hasVoted[pollId][msg.sender] = true;
        p.votes[option] += 1;
        emit Voted(pollId, msg.sender, option);
    }

    function pollCount() external view returns (uint256) {
        return _polls.length;
    }

    function getPoll(uint256 pollId)
        external
        view
        returns (
            string memory question,
            string[] memory options,
            uint256[] memory votes,
            uint256 endsAt,
            address creator
        )
    {
        require(pollId < _polls.length, "OneVoice: no such poll");
        Poll storage p = _polls[pollId];
        return (p.question, p.options, p.votes, p.endsAt, p.creator);
    }
}
