// MCTS.js

class Node {
    constructor(state, parent = null, move = null) {
        this.state = state;
        this.parent = parent;
        this.move = move; // The move that led to this state from the parent
        this.children = [];
        this.visits = 0;
        this.totalScore = 0; // Sum of scores from simulations
    }

    addChild(child) {
        this.children.push(child);
    }

    incrementVisits() {
        this.visits++;
    }

    addScore(score) {
        this.totalScore += score;
    }
}

class MCTS {
    constructor(iterations = 1000, stage) {
        this.iterations = iterations;
        this.stage = stage; // 'Fortify' or 'Battle'
        this.minScore = null;
        this.maxScore = null;
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
            let uctValue;
            if (child.visits === 0) {
                uctValue = Infinity; // Ensure unvisited nodes are explored
            } else {
                uctValue = (child.totalScore / child.visits) + Math.sqrt(2 * Math.log(node.visits) / child.visits);
            }
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

        let playoutStage = this.stage; // Start from the current stage
        let currentPlayerIndex = tempState.players.findIndex(p => p.name === tempState.currentPlayer.name);

        // Simulate until a terminal state is reached or until a maximum depth
        const maxDepth = 10; // Limit the depth to prevent infinite loops
        let depth = 0;

        while (!this.isTerminal(tempState) && depth < maxDepth) {
            depth++;

            if (playoutStage === 'Fortify') {
                // Move to Battle stage after Fortify
                playoutStage = 'Battle';
            } else if (playoutStage === 'Battle') {
                // Simulate Battle stage for current player
                const possibleMoves = this.getPossibleMoves(tempState, playoutStage);
                if (possibleMoves.length > 0) {
                    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                    tempState = randomMove.state;
                }
                // Move to next player's turn
                currentPlayerIndex = (currentPlayerIndex + 1) % tempState.players.length;
                tempState.currentPlayer = tempState.players[currentPlayerIndex];
                playoutStage = 'Fortify';
            } else {
                // Simulate other players' turns with random moves
                // For simplicity, we can skip detailed simulation and just proceed
                currentPlayerIndex = (currentPlayerIndex + 1) % tempState.players.length;
                tempState.currentPlayer = tempState.players[currentPlayerIndex];
                playoutStage = 'Fortify';
            }
        }

        const score = this.calculateScore(tempState);
        return score;
    }

    backPropagation(node, score) {
        while (node !== null) {
            node.incrementVisits();
            node.addScore(score); // Accumulate the score
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

        const topMoves = this.getTopMoves(rootNode, 5);
        return topMoves;
    }

    getTopMoves(rootNode, N) {
        if (rootNode.children.length === 0) {
            console.warn("No possible moves found.");
            return [];
        }

        // Collect children and their stats
        const childrenStats = rootNode.children.map(child => {
            const averageScore = child.totalScore / child.visits;
            return {
                move: child.move,
                visits: child.visits,
                totalScore: child.totalScore,
                averageScore: averageScore,
                child: child
            };
        });

        // Sort by average score
        childrenStats.sort((a, b) => b.averageScore - a.averageScore);

        // Get top N moves
        const topMoves = childrenStats.slice(0, N).map(stat => {
            return {
                move: stat.move,
                score: stat.averageScore,
                visits: stat.visits,
                totalScore: stat.totalScore
            };
        });

        // Determine the score range for display
        this.minScore = Math.min(...childrenStats.map(stat => stat.averageScore));
        this.maxScore = Math.max(...childrenStats.map(stat => stat.averageScore));

        return topMoves;
    }

    getPossibleMoves(state, stageOverride = null) {
        const stage = stageOverride || this.stage;
        if (stage === 'Fortify') {
            return this.getFortifyMoves(state);
        } else if (stage === 'Battle') {
            return this.getBattleMoves(state);
        }
        return [];
    }

    isTerminal(state) {
        // For simulation purposes, we consider the game terminal if a player has won or after a certain depth
        const remainingPlayers = state.players.filter(player => player.areas.length > 0);
        if (remainingPlayers.length <= 1) {
            return true;
        }
        return false;
    }

    getFortifyMoves(state) {
        const possibleMoves = [];
        if (!state || !state.countries || !state.currentPlayer || state.currentPlayer.reserve <= 0) {
            return possibleMoves;
        }

        const ownedCountries = state.countries.filter(country => country.owner === state.currentPlayer.name);

        // Rank countries by vulnerability and opportunity
        const rankedCountries = ownedCountries.map(country => {
            const enemyNeighbors = country.neighbours.filter(neighbourName => {
                const neighbour = state.countries.find(c => c.name === neighbourName);
                return neighbour && neighbour.owner !== state.currentPlayer.name;
            });

            const opportunity = enemyNeighbors.reduce((sum, neighbourName) => {
                const neighbour = state.countries.find(c => c.name === neighbourName);
                return sum + (neighbour ? neighbour.army : 0);
            }, 0);

            // Higher vulnerability and higher opportunity increase the score
            const score = enemyNeighbors.length * 2 + opportunity;

            return {
                country: country,
                vulnerability: enemyNeighbors.length,
                opportunity: opportunity,
                score: score
            };
        });

        // Sort countries based on the combined score
        rankedCountries.sort((a, b) => b.score - a.score);

        const totalScore = rankedCountries.reduce((sum, item) => sum + item.score, 0);

        // Generate initial allocation proportional to the scores
        const initialAllocation = rankedCountries.map(item => {
            const proportion = item.score / totalScore;
            const troops = Math.floor(proportion * state.currentPlayer.reserve);
            return {
                country: item.country.name,
                troops: troops
            };
        });

        // Adjust allocations to ensure total troops allocated equals reserve
        let allocatedTroops = initialAllocation.reduce((sum, alloc) => sum + alloc.troops, 0);
        let remainingTroops = state.currentPlayer.reserve - allocatedTroops;

        // Distribute remaining troops one by one to the countries with highest score
        for (let i = 0; remainingTroops > 0; i = (i + 1) % initialAllocation.length) {
            initialAllocation[i].troops += 1;
            remainingTroops -= 1;
        }

        // Generate variations of the allocation by swapping troops between countries
        const allocations = this.generateAllocationVariations(initialAllocation, 1000); // Generate 1000 variations

        allocations.forEach(allocation => {
            const newState = JSON.parse(JSON.stringify(state));
            const newPlayer = newState.currentPlayer;

            // Apply allocation to newState
            allocation.forEach(alloc => {
                const countryName = alloc.country;
                const troops = alloc.troops;
                const newCountry = newState.countries.find(c => c.name === countryName);
                newCountry.army += troops;
            });
            newPlayer.reserve = 0; // All troops allocated

            const move = {
                type: 'fortify',
                allocations: allocation
            };

            possibleMoves.push({ state: newState, move: move });
        });

        return possibleMoves;
    }

    // Helper function to generate allocation variations
    generateAllocationVariations(initialAllocation, numVariations) {
        const allocations = [initialAllocation];
        for (let i = 0; i < numVariations - 1; i++) {
            const newAllocation = JSON.parse(JSON.stringify(initialAllocation));
            // Randomly choose two countries to swap troops
            const idx1 = Math.floor(Math.random() * newAllocation.length);
            let idx2 = Math.floor(Math.random() * newAllocation.length);
            while (idx2 === idx1) {
                idx2 = Math.floor(Math.random() * newAllocation.length);
            }

            if (newAllocation[idx1].troops > 0) {
                newAllocation[idx1].troops -= 1;
                newAllocation[idx2].troops += 1;
                allocations.push(newAllocation);
            }
        }
        return allocations;
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

        // Higher score for more territories and army strength
        const totalArmy = currentPlayer.areas.reduce((sum, areaName) => {
            const country = state.countries.find(c => c.name === areaName);
            return sum + (country ? country.army : 0);
        }, 0);

        score += currentPlayer.areas.length * 10; // Each territory is worth 10 points
        score += totalArmy * 2; // Each army unit is worth 2 points

        // Bonus for controlling continents
        const controlledContinents = this.getControlledContinents(currentPlayer, state);
        score += controlledContinents.length * 50;

        // Penalty for enemy neighbors
        const enemyBorders = currentPlayer.areas.reduce((sum, areaName) => {
            const country = state.countries.find(c => c.name === areaName);
            if (!country) return sum;
            const enemyNeighbors = country.neighbours.filter(neighbourName => {
                const neighbour = state.countries.find(c => c.name === neighbourName);
                return neighbour && neighbour.owner !== currentPlayer.name;
            });
            return sum + enemyNeighbors.length;
        }, 0);

        score -= enemyBorders * 5; // Each enemy border reduces the score

        // Ensure score is a valid number
        if (isNaN(score)) {
            score = 0;
        }

        return score;
    }

    getControlledContinents(player, state) {
        const controlledContinents = [];
        if (!state.continents) return controlledContinents;
        state.continents.forEach(continent => {
            const isControlled = continent.areas.every(area => player.areas.includes(area));
            if (isControlled) {
                controlledContinents.push(continent);
            }
        });
        return controlledContinents;
    }
}

// Function to generate the top moves
function generateTopMoves(currentState, stage) {
    const mcts = new MCTS(1000, stage); // Number of iterations
    const moves = mcts.runMCTS(currentState);
    // Store the score range in the moves array
    moves.minScore = mcts.minScore;
    moves.maxScore = mcts.maxScore;
    return moves; // Return the top moves with their scores
}

// Integrate with your game logic
function getTopMovesForPlayer(player) {
    const currentState = {
        countries: Gamestate.countries,
        players: Gamestate.players,
        currentPlayer: player,
        continents: Gamestate.continents // Ensure continents are included if used
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

    // Render the recommended moves in the HTML
    topMovesDiv.innerHTML = ''; // Clear previous recommendations

    if (moves.length === 0) {
        topMovesDiv.innerHTML = '<p>No recommendations available.</p>';
        return;
    }

    // Get the score range from the MCTS instance
    const minScore = moves.minScore;
    const maxScore = moves.maxScore;

    // Format the moves to display as readable text with scores
    moves.forEach((moveObj, index) => {
        const move = moveObj.move;
        const score = moveObj.score.toFixed(2);
        const moveElement = document.createElement('p');
        if (stage === 'Fortify') {
            const allocationsText = move.allocations
                .filter(alloc => alloc.troops > 0) // Only display allocations with troops
                .map(alloc => `<strong>${alloc.troops}</strong> troop(s) to <strong>${alloc.country}</strong>`)
                .join(', ');
            moveElement.innerHTML = `${index + 1}. Allocate: ${allocationsText} (Score: ${score} in range ${minScore.toFixed(2)} - ${maxScore.toFixed(2)})`;
        } else if (stage === 'Battle') {
            moveElement.innerHTML = `${index + 1}. Attack from <strong>${move.from}</strong> to <strong>${move.to}</strong> (Score: ${score} in range ${minScore.toFixed(2)} - ${maxScore.toFixed(2)})`;
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
