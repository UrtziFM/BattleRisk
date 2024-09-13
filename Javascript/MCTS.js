// MCTS.js

class Node {
    constructor(state, parent = null, move = null) {
        this.state = state; 
        this.parent = parent;
        this.move = move; // The move that led to this state from the parent
        this.children = [];
        this.visits = 0;
        this.wins = 0;
    }

    addChild(child) {
        this.children.push(child);
    }

    incrementVisits() {
        this.visits++;
    }

    addWins(wins) {
        this.wins += wins;
    }
}

class MCTS {
    constructor(iterations = 1000, stage) {
        this.iterations = iterations;
        this.stage = stage; // 'Fortify' or 'Battle'
    }

    selectPromisingNode(node) {
        while (node.children.length !== 0) {
            node = this.bestUCT(node);
        }
        return node;
    }

    bestUCT(node) {
        let bestNode = null;
        let maxUCT = -Infinity;
        node.children.forEach(child => {
            let uctValue = (child.wins / child.visits) + Math.sqrt(2 * Math.log(node.visits) / child.visits);
            if (uctValue > maxUCT) {
                bestNode = child;
                maxUCT = uctValue;
            }
        });
        return bestNode;
    }

    expandNode(node) {
        const possibleMoves = this.getPossibleMoves(node.state);
        possibleMoves.forEach(possibleMove => {
            const newNode = new Node(possibleMove.state, node, possibleMove.move);
            node.addChild(newNode);
        });
    }

    simulateRandomPlayout(node) {
        let tempState = JSON.parse(JSON.stringify(node.state));

        while (!this.isTerminal(tempState)) {
            const possibleMoves = this.getPossibleMoves(tempState);
            if (possibleMoves.length === 0) break;
            const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            tempState = randomMove.state;
        }

        const score = this.calculateScore(tempState);
        return score;
    }

    backPropagation(node, score) {
        while (node !== null) {
            node.incrementVisits();
            node.addWins(score);
            node = node.parent;
        }
    }

    runMCTS(rootState) {
        const rootNode = new Node(rootState);

        for (let i = 0; i < this.iterations; i++) {
            const promisingNode = this.selectPromisingNode(rootNode);
            if (!this.isTerminal(promisingNode.state)) {
                this.expandNode(promisingNode);
            }
            let nodeToExplore = promisingNode;
            if (promisingNode.children.length > 0) {
                nodeToExplore = promisingNode.children[Math.floor(Math.random() * promisingNode.children.length)];
            }
            const score = this.simulateRandomPlayout(nodeToExplore);
            this.backPropagation(nodeToExplore, score);
        }

        const bestNode = this.getBestMove(rootNode);
        const moves = this.getBestMoves(bestNode);
        return moves;
    }

    getBestMove(rootNode) {
        if (rootNode.children.length === 0) {
            console.warn("No possible moves found.");
            return rootNode;
        }

        const bestChild = rootNode.children.reduce((prev, curr) => (prev.visits > curr.visits ? prev : curr));
        return bestChild;
    }

    getBestMoves(node) {
        const moves = [];
        while (node.parent !== null && node.move !== null) {
            moves.unshift(node.move);
            node = node.parent;
        }
        return moves;
    }

    getPossibleMoves(state) {
        if (this.stage === 'Fortify') {
            return this.getFortifyMoves(state);
        } else if (this.stage === 'Battle') {
            return this.getBattleMoves(state);
        }
        return [];
    }

    getFortifyMoves(state) {
        const possibleMoves = [];

        if (!state || !state.countries || !state.currentPlayer || state.currentPlayer.reserve <= 0) {
            return possibleMoves;
        }

        // Generate possible fortify moves by adding troops to own countries
        state.countries.forEach(country => {
            if (country.owner === state.currentPlayer.name) {
                const newState = JSON.parse(JSON.stringify(state));
                const newCountry = newState.countries.find(c => c.name === country.name);
                const newPlayer = newState.currentPlayer;

                // Distribute troops (for simplicity, add one troop per move)
                newCountry.army += 1;
                newPlayer.reserve -= 1;

                const move = {
                    type: 'fortify',
                    country: country.name,
                    troops: 1
                };

                possibleMoves.push({ state: newState, move: move });
            }
        });

        return possibleMoves;
    }

    getBattleMoves(state) {
        const possibleMoves = [];

        if (!state || !state.countries || !state.currentPlayer) return possibleMoves;

        state.countries.forEach(country => {
            if (country.owner === state.currentPlayer.name && country.army > 1) {
                country.neighbours.forEach(neighbourName => {
                    const neighbour = state.countries.find(c => c.name === neighbourName);
                    if (neighbour && neighbour.owner !== state.currentPlayer.name) {
                        const { newState, move } = this.simulateAttack(state, country, neighbour);
                        possibleMoves.push({ state: newState, move: move });
                    }
                });
            }
        });

        return possibleMoves;
    }

    simulateAttack(state, fromCountry, toCountry) {
        const newState = JSON.parse(JSON.stringify(state)); // Clone the state

        const newFromCountry = newState.countries.find(c => c.name === fromCountry.name);
        const newToCountry = newState.countries.find(c => c.name === toCountry.name);

        // Simple dice roll simulation based on Risk rules
        const attackerDice = Math.min(newFromCountry.army - 1, 3);
        const defenderDice = Math.min(newToCountry.army, 2);

        const attackerRolls = Array.from({ length: attackerDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
        const defenderRolls = Array.from({ length: defenderDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

        for (let i = 0; i < Math.min(attackerDice, defenderDice); i++) {
            if (attackerRolls[i] > defenderRolls[i]) {
                newToCountry.army -= 1;
            } else {
                newFromCountry.army -= 1;
            }
        }

        // Handle capture of the country
        if (newToCountry.army <= 0) {
            newToCountry.owner = state.currentPlayer.name;
            const armiesToMove = attackerDice;
            newToCountry.army = armiesToMove;
            newFromCountry.army -= armiesToMove;

            const player = newState.players.find(p => p.name === state.currentPlayer.name);
            if (player) {
                player.areas.push(newToCountry.name);
            }

            const defendingPlayer = newState.players.find(p => p.name === toCountry.owner);
            if (defendingPlayer) {
                const index = defendingPlayer.areas.indexOf(newToCountry.name);
                if (index !== -1) {
                    defendingPlayer.areas.splice(index, 1);
                }
            }
        }

        const move = {
            type: 'attack',
            from: fromCountry.name,
            to: toCountry.name
        };

        return { newState, move };
    }

    calculateScore(state) {
        if (!state || !state.players) return 0;
        const currentPlayer = state.players.find(p => p.name === state.currentPlayer.name);
        if (!currentPlayer) return 0;

        let score = 0;

        if (this.stage === 'Fortify') {
            // Higher score for strengthening vulnerable positions
            score = currentPlayer.areas.reduce((sum, areaName) => {
                const country = state.countries.find(c => c.name === areaName);
                const enemyNeighbors = country.neighbours.filter(neighbourName => {
                    const neighbour = state.countries.find(c => c.name === neighbourName);
                    return neighbour && neighbour.owner !== currentPlayer.name;
                }).length;
                return sum + (country.army * 2) - (enemyNeighbors * 3);
            }, 0);
        } else if (this.stage === 'Battle') {
            // Higher score for more territories
            score = currentPlayer.areas.length * 10;
            // Bonus for controlling continents
            const controlledContinents = this.getControlledContinents(currentPlayer, state);
            score += controlledContinents.length * 50;
        }

        return score;
    }

    getControlledContinents(player, state) {
        const controlledContinents = [];
        continents.forEach(continent => {
            const isControlled = continent.areas.every(area => player.areas.includes(area));
            if (isControlled) {
                controlledContinents.push(continent);
            }
        });
        return controlledContinents;
    }

    isTerminal(state) {
        if (this.stage === 'Fortify') {
            return state.currentPlayer.reserve <= 0;
        }

        if (this.stage === 'Battle') {
            const canAttack = state.countries.some(country => {
                if (country.owner === state.currentPlayer.name && country.army > 1) {
                    return country.neighbours.some(neighbourName => {
                        const neighbour = state.countries.find(c => c.name === neighbourName);
                        return neighbour && neighbour.owner !== state.currentPlayer.name;
                    });
                }
                return false;
            });
            return !canAttack;
        }

        return false;
    }
}

// Function to generate the top moves
function generateTopMoves(currentState, stage) {
    const mcts = new MCTS(1000, stage); // Number of iterations
    const moves = mcts.runMCTS(currentState);
    return moves; // Return the sequence of moves leading to the best state
}

// Integrate with your game logic
function getTopMovesForPlayer(player) {
    const currentState = {
        countries: Gamestate.countries,
        players: Gamestate.players,
        currentPlayer: player
    };

    const stage = Gamestate.stage; // 'Fortify', 'Battle', or 'AI Turn'

    const recommendButton = document.getElementById('recommend-btn');
    const topMovesDiv = document.getElementById("top-moves");

    if (stage === 'AI Turn') {
        // Disable recommendations button
        recommendButton.disabled = true;
        topMovesDiv.innerHTML = '<p>No recommendations during AI Turn.</p>';
        return;
    } else {
        // Enable recommendations button
        recommendButton.disabled = false;
    }

    const moves = generateTopMoves(currentState, stage);

    // Get only the top 5 moves
    const recommendedMoves = moves.slice(0, 5);

    // Render the recommended moves in the HTML
    topMovesDiv.innerHTML = ''; // Clear previous recommendations

    // Format the moves to display as readable text
    recommendedMoves.forEach((move, index) => {
        const moveElement = document.createElement('p');
        if (stage === 'Fortify') {
            moveElement.innerHTML = `${index + 1}. Allocate <strong>${move.troops}</strong> troop(s) to <strong>${move.country}</strong>`;
        } else if (stage === 'Battle') {
            moveElement.innerHTML = `${index + 1}. Attack from <strong>${move.from}</strong> to <strong>${move.to}</strong>`;
        }
        topMovesDiv.appendChild(moveElement);
    });
}

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    const recommendButton = document.getElementById('recommend-btn');
    
    recommendButton.addEventListener('click', () => {
        getTopMovesForPlayer(Gamestate.player); // Call the function to get recommendations when clicked
    });
});
