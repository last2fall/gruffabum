// GRUFF IS A BUM Game
document.addEventListener('DOMContentLoaded', function() {
    console.log('GRUFF IS A BUM initialized!');
    
    const gridRows = 8;
    const gridCols = 10;
    let grid = [];
    let targetSequence = [];
    let currentLinearPos = 33; // 4th row (row 3), middle: 3 cells left + 4 highlighted + 3 cells right
    let timeLeft = 10.0;
    let gameActive = false;
    let shiftInterval;

    const statusElement = document.getElementById('status');
    const targetElement = document.getElementById('target');
    const timerElement = document.getElementById('timer');
    const gridElement = document.getElementById('grid');

    function startGame() {
        console.log('Starting new game...');
        
        // Clear any existing intervals
        if (shiftInterval) {
            clearInterval(shiftInterval);
        }

        // Generate random target sequence (4 double-letter pairs)
        targetSequence = [];
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 4; i++) {
            const pair = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
            targetSequence.push(pair);
        }
        targetElement.textContent = `TARGET: ${targetSequence.join(' ')}`;

        // Initialize 10x8 grid with random double letters
        grid = [];
        gridElement.innerHTML = '';
        
        for (let i = 0; i < gridRows; i++) {
            grid[i] = [];
            for (let j = 0; j < gridCols; j++) {
                const pair = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = pair;
                cell.addEventListener('click', () => handleCellClick(i, j));
                gridElement.appendChild(cell);
                grid[i][j] = pair;
            }
        }

        // Place target sequence randomly in grid (ensure it exists somewhere)
        const targetRow = Math.floor(Math.random() * gridRows);
        const targetStartCol = Math.floor(Math.random() * (gridCols - 3));
        
        for (let j = 0; j < 4; j++) {
            grid[targetRow][targetStartCol + j] = targetSequence[j];
            const cellIndex = targetRow * gridCols + targetStartCol + j;
            gridElement.children[cellIndex].textContent = targetSequence[j];
        }

        // Reset game state
        timeLeft = 10.0;
        gameActive = true;
        currentLinearPos = 33; // Row 3 (4th row), col 3: leaves 3 cells on left, 4 highlighted, 3 on right
        
        statusElement.textContent = 'FIND THE SEQUENCE';
        statusElement.className = '';
        
        updateHighlighting();
        updateTimer();
        scheduleShift();
    }

    function handleCellClick(row, col) {
        if (!gameActive) return;
        
        // Convert clicked position to linear position
        currentLinearPos = row * gridCols + col;
        updateHighlighting();
    }

    function linearToRowCol(linear) {
        const totalCells = gridRows * gridCols;
        linear = ((linear % totalCells) + totalCells) % totalCells;
        return {
            row: Math.floor(linear / gridCols),
            col: linear % gridCols
        };
    }

    function updateHighlighting() {
        // Clear all existing highlights and boxes
        const cells = gridElement.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('highlighted'));
        
        // Remove ALL existing highlight boxes
        const existingBoxes = gridElement.querySelectorAll('.targetBox, #targetBox');
        existingBoxes.forEach(box => box.remove());
        
        const totalCells = gridRows * gridCols;
        const cellSize = 53; // 45px + 8px gap
        
        // Get all 4 positions
        const positions = [];
        for (let i = 0; i < 4; i++) {
            const linearPos = (currentLinearPos + i) % totalCells;
            positions.push(linearToRowCol(linearPos));
        }
        
        // Group positions by row
        const rowGroups = {};
        positions.forEach((pos, index) => {
            if (!rowGroups[pos.row]) {
                rowGroups[pos.row] = [];
            }
            rowGroups[pos.row].push({pos, originalIndex: index});
        });
        
        // Create highlight boxes for each row group
        Object.keys(rowGroups).forEach((rowKey) => {
            const row = parseInt(rowKey);
            const group = rowGroups[rowKey];
            
            // Sort by column to ensure proper ordering
            group.sort((a, b) => a.pos.col - b.pos.col);
            
            // Check if columns are consecutive
            let isConsecutive = true;
            for (let i = 1; i < group.length; i++) {
                if (group[i].pos.col !== group[i-1].pos.col + 1) {
                    isConsecutive = false;
                    break;
                }
            }
            
            if (isConsecutive) {
                // Create one box for consecutive cells
                const startCol = group[0].pos.col;
                const endCol = group[group.length - 1].pos.col;
                
                const box = document.createElement('div');
                box.className = 'targetBox';
                box.style.position = 'absolute';
                box.style.top = `${(row * cellSize)}px`;
                box.style.left = `${(startCol * cellSize)}px`;
                box.style.width = `${(group.length * cellSize) - 8}px`;
                box.style.height = '45px';
                box.style.border = '2px solid #00ff41';
                box.style.background = 'transparent';
                box.style.pointerEvents = 'none';
                box.style.zIndex = '10';
                box.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.5)';
                
                gridElement.appendChild(box);
            } else {
                // Create individual boxes for non-consecutive cells
                group.forEach(item => {
                    const box = document.createElement('div');
                    box.className = 'targetBox';
                    box.style.position = 'absolute';
                    box.style.top = `${(row * cellSize)}px`;
                    box.style.left = `${(item.pos.col * cellSize)}px`;
                    box.style.width = '45px';
                    box.style.height = '45px';
                    box.style.border = '2px solid #00ff41';
                    box.style.background = 'transparent';
                    box.style.pointerEvents = 'none';
                    box.style.zIndex = '10';
                    box.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.5)';
                    
                    gridElement.appendChild(box);
                });
            }
        });
        
        // Add highlighted class to cells
        positions.forEach((pos, index) => {
            const cellIndex = pos.row * gridCols + pos.col;
            if (cells[cellIndex]) {
                cells[cellIndex].classList.add('highlighted');
            }
        });
    }

    function checkMatch() {
        if (!gameActive) return;
        
        let matches = 0;
        const currentSequence = [];
        const totalCells = gridRows * gridCols;
        
        // Get 4 consecutive cells starting from current position
        for (let i = 0; i < 4; i++) {
            const linearPos = (currentLinearPos + i) % totalCells;
            const pos = linearToRowCol(linearPos);
            const cellValue = grid[pos.row][pos.col];
            currentSequence.push(cellValue);
            if (cellValue === targetSequence[i]) {
                matches++;
            }
        }
        
        console.log(`Checking match: ${currentSequence.join(' ')} vs ${targetSequence.join(' ')}`);
        console.log(`Matches: ${matches}/4`);
        
        if (matches === 4) {
            statusElement.textContent = 'SUCCESS! SEQUENCE MATCHED!';
            statusElement.className = 'success';
            gameActive = false;
            clearInterval(shiftInterval);
            setTimeout(startGame, 2000);
        } else {
            statusElement.textContent = `WRONG INPUT (${matches}/4 CORRECT)`;
            statusElement.className = 'failure';
            setTimeout(() => {
                if (gameActive) {
                    statusElement.textContent = 'FIND THE SEQUENCE';
                    statusElement.className = '';
                }
            }, 1500);
        }
    }

    function updateTimer() {
        if (!gameActive) return;
        
        timeLeft -= 0.1;
        timerElement.textContent = `${timeLeft.toFixed(2)} SEC LEFT`;
        
        if (timeLeft <= 0) {
            statusElement.textContent = 'TIME UP! MISSION FAILED';
            statusElement.className = 'failure';
            gameActive = false;
            clearInterval(shiftInterval);
            setTimeout(startGame, 2000);
        } else {
            setTimeout(updateTimer, 100);
        }
    }

    function shiftGrid() {
        if (!gameActive) return;
        
        console.log('Shifting grid...');
        
        // Flatten the grid
        let flat = [];
        for (let i = 0; i < gridRows; i++) {
            for (let j = 0; j < gridCols; j++) {
                flat.push(grid[i][j]);
            }
        }
        
        // Shift left (move first element to end)
        const first = flat.shift();
        flat.push(first);
        
        // Reshape back to grid
        let idx = 0;
        for (let i = 0; i < gridRows; i++) {
            for (let j = 0; j < gridCols; j++) {
                grid[i][j] = flat[idx++];
            }
        }
        
        updateGridDisplay();
    }

    function updateGridDisplay() {
        for (let i = 0; i < gridRows; i++) {
            for (let j = 0; j < gridCols; j++) {
                const idx = i * gridCols + j;
                if (gridElement.children[idx]) {
                    gridElement.children[idx].textContent = grid[i][j];
                }
            }
        }
    }

    function scheduleShift() {
        if (!gameActive) return;
        
        const delay = Math.random() * 2000 + 1500; // 1.5-3.5 seconds
        shiftInterval = setTimeout(() => {
            shiftGrid();
            scheduleShift();
        }, delay);
    }

    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
        if (!gameActive) return;
        
        const totalCells = gridRows * gridCols;
        
        switch (event.code) {
            case 'ArrowUp':
                event.preventDefault();
                currentLinearPos = (currentLinearPos - gridCols + totalCells) % totalCells;
                break;
            case 'ArrowDown':
                event.preventDefault();
                currentLinearPos = (currentLinearPos + gridCols) % totalCells;
                break;
            case 'ArrowLeft':
                event.preventDefault();
                currentLinearPos = (currentLinearPos - 1 + totalCells) % totalCells;
                break;
            case 'ArrowRight':
                event.preventDefault();
                currentLinearPos = (currentLinearPos + 1) % totalCells;
                break;
            case 'Space':
                event.preventDefault();
                checkMatch();
                return;
            case 'Enter':
                event.preventDefault();
                checkMatch();
                return;
        }
        
        updateHighlighting();
    });

    // Prevent arrow keys from scrolling the page
    window.addEventListener('keydown', (e) => {
        if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) > -1) {
            e.preventDefault();
        }
    }, false);

    // Start the game when page loads
    setTimeout(startGame, 1000);
});