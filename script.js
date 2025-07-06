document.addEventListener('DOMContentLoaded', () => {
    const newMemberNameInput = document.getElementById('new-member-name');
    const addMemberButton = document.getElementById('add-member');
    const membersList = document.getElementById('members-list');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseAmountInput = document.getElementById('expense-amount');
    const addExpenseButton = document.getElementById('add-expense');
    const expenseMembersContainer = document.getElementById('expense-members');
    const expenseBreakdownList = document.getElementById('expense-breakdown-list');
    const transferSummaryBody = document.getElementById('transfer-summary-body');
    const saveAsImageButton = document.getElementById('save-as-image');
    const captureArea = document.getElementById('capture-area');

    const saveDataButton = document.getElementById('save-data');

    let members = [];
    let expenses = [];
    let editingExpenseIndex = null;
    let currentLoadedDataName = null;

    // --- Data Persistence Functions ---
    function saveDataToLocalStorage(name) {
        const data = { members, expenses };
        localStorage.setItem(`expenseSplitter_${name}`, JSON.stringify(data));

        let savedNames = JSON.parse(localStorage.getItem('expenseSplitterSavedNames') || '[]');
        if (!savedNames.includes(name)) {
            savedNames.push(name);
            localStorage.setItem('expenseSplitterSavedNames', JSON.stringify(savedNames));
        }
        alert(`'${name}'으로 데이터가 성공적으로 저장되었습니다!`);
    }

    function loadDataFromLocalStorage(name) {
        const savedData = localStorage.getItem(`expenseSplitter_${name}`);
        if (savedData) {
            const data = JSON.parse(savedData);
            members = data.members || [];
            expenses = data.expenses || [];
            currentLoadedDataName = name;
            alert(`'${name}' 데이터를 성공적으로 불러왔습니다!`);
        } else {
            members = [];
            expenses = [];
            alert(`'${name}' 데이터를 찾을 수 없습니다. 새로운 정산을 시작합니다.`);
        }
        renderMembers();
        renderExpenseMembers();
        calculateAndRenderResults();
    }

    // --- Event Listeners ---
    saveDataButton.addEventListener('click', () => {
        let saveName = currentLoadedDataName;
        if (!saveName) {
            saveName = prompt('저장할 이름을 입력하세요:');
        }
        if (saveName) {
            saveDataToLocalStorage(saveName);
            currentLoadedDataName = saveName; // 저장 후 현재 이름 업데이트
        }
    });

    newMemberNameInput.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            addMemberButton.click();
        }
    });

    expenseAmountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addExpenseButton.click();
        }
    });

    addMemberButton.addEventListener('click', () => {
        const memberName = newMemberNameInput.value.trim();
        if (memberName && !members.includes(memberName)) {
            members.push(memberName);
            newMemberNameInput.value = '';
            renderMembers();
            renderExpenseMembers();
        }
    });

    addExpenseButton.addEventListener('click', () => {
        const description = expenseDescriptionInput.value.trim();
        const amount = parseFloat(expenseAmountInput.value);
        const participants = [];
        document.querySelectorAll('#expense-members input[type="checkbox"]:checked').forEach(checkbox => {
            participants.push(checkbox.value);
        });

        if (description && amount > 0 && participants.length > 0) {
            const newExpense = { description, amount, participants };
            if (editingExpenseIndex !== null) {
                expenses[editingExpenseIndex] = newExpense;
                editingExpenseIndex = null;
                addExpenseButton.textContent = '비용 추가';
                addExpenseButton.classList.replace('btn-warning', 'btn-success');
            } else {
                expenses.push(newExpense);
            }
            clearExpenseForm();
            calculateAndRenderResults();
        }
    });

    saveAsImageButton.addEventListener('click', () => {
        const excelSummaryCard = document.querySelector('#excel-summary-area').closest('.card');
        const transferSummaryCard = document.querySelector('#transfer-summary-body').closest('.card');

        if (!excelSummaryCard || !transferSummaryCard) {
            alert('캡처할 영역을 찾을 수 없습니다.');
            return;
        }

        // Create a temporary container to hold the elements to be captured
        const tempCaptureContainer = document.createElement('div');
        tempCaptureContainer.style.position = 'absolute';
        tempCaptureContainer.style.left = '-9999px'; // Move off-screen
        tempCaptureContainer.style.width = '800px'; // Set a reasonable width for capture
        tempCaptureContainer.style.backgroundColor = 'white'; // Ensure background is white

        // Clone the elements and append to the temporary container
        tempCaptureContainer.appendChild(excelSummaryCard.cloneNode(true));
        tempCaptureContainer.appendChild(transferSummaryCard.cloneNode(true));

        document.body.appendChild(tempCaptureContainer);

        html2canvas(tempCaptureContainer, {
            scale: 2, // Increase scale for better quality
            useCORS: true // Enable cross-origin images if any
        }).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = '정산_결과.png';
            link.click();
            document.body.removeChild(tempCaptureContainer); // Remove temporary container
        }).catch(error => {
            console.error('Error capturing image:', error);
            alert('이미지 저장 중 오류가 발생했습니다.');
            document.body.removeChild(tempCaptureContainer); // Ensure removal even on error
        });
    });

    function clearExpenseForm() {
        expenseDescriptionInput.value = '';
        expenseAmountInput.value = '';
        document.querySelectorAll('#expense-members input[type="checkbox"]').forEach(checkbox => checkbox.checked = true);
    }

    function renderMembers() {
        membersList.innerHTML = '';
        members.forEach(member => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `<span class="member-name">${member}</span><button class="btn btn-danger btn-sm remove-member">삭제</button>`;
            membersList.appendChild(li);
        });
        document.querySelectorAll('.remove-member').forEach((button, index) => {
            button.addEventListener('click', () => {
                members.splice(index, 1);
                renderMembers();
                renderExpenseMembers();
                calculateAndRenderResults();
            });
        });
    }

    function renderExpenseMembers() {
        expenseMembersContainer.innerHTML = '<label>참여자</label>';
        members.forEach(member => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `<input class="form-check-input" type="checkbox" value="${member}" id="check-${member}" checked>
                             <label class="form-check-label" for="check-${member}">${member}</label>`;
            expenseMembersContainer.appendChild(div);
        });
    }

    function calculateAndRenderResults() {
        expenseBreakdownList.innerHTML = '';
        transferSummaryBody.innerHTML = ''; // Clear previous summary

        if (members.length < 2) return; // Need at least 2 members to make a transfer

        // 1. Render Expense Breakdown (same as before)
        expenses.forEach((expense, index) => {
            const splitAmount = expense.amount / expense.participants.length;
            const expenseCard = document.createElement('div');
            expenseCard.className = 'card mb-2';
            let cardBodyHtml = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="card-title mb-0">${expense.description} (총 ${expense.amount.toLocaleString()}원)</h6>
                        <div>
                            <button class="btn btn-outline-primary btn-sm edit-expense" data-index="${index}">수정</button>
                            <button class="btn btn-outline-danger btn-sm delete-expense" data-index="${index}">삭제</button>
                        </div>
                    </div>
                    <hr>
                    <ul class="list-group list-group-flush">
            `;
            expense.participants.forEach(participant => {
                cardBodyHtml += `<li class="list-group-item">${participant}: ${Math.floor(splitAmount).toLocaleString()}원 부담</li>`;
            });
            cardBodyHtml += `</ul></div>`;
            expenseCard.innerHTML = cardBodyHtml;
            expenseBreakdownList.appendChild(expenseCard);
        });

        addEditDeleteListeners();

        // 2. Calculate Final Balances (Simplified)
        let memberBalances = {};
        members.forEach(member => memberBalances[member] = 0);

        expenses.forEach(expense => {
            const splitAmount = expense.amount / expense.participants.length;
            expense.participants.forEach(participant => {
                memberBalances[participant] += splitAmount; // 각 참여자가 부담해야 할 금액을 양수로 누적
            });
        });

        // 3. Render Final Balances
        transferSummaryBody.innerHTML = ''; // Clear previous summary
        const finalBalancesDiv = document.createElement('div');
        finalBalancesDiv.className = 'list-group';

        for (const member in memberBalances) {
            const balance = memberBalances[member];
            const balanceText = balance >= 0 ? `+${Math.round(balance).toLocaleString()}원` : `${Math.round(balance).toLocaleString()}원`;
            const balanceItem = document.createElement('div');
            balanceItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            balanceItem.innerHTML = `
                <span>${member}</span>
                <span class="${balance >= 0 ? 'text-success' : 'text-danger'}">${balanceText}</span>
            `;
            finalBalancesDiv.appendChild(balanceItem);
        }
        transferSummaryBody.appendChild(finalBalancesDiv);
        renderExcelSummary();
    }

    function renderExcelSummary() {
        const excelSummaryArea = document.getElementById('excel-summary-area');
        excelSummaryArea.innerHTML = ''; // Clear previous summary

        if (members.length === 0 || expenses.length === 0) {
            excelSummaryArea.innerHTML = '<p class="text-muted">비용 상세 내역을 보려면 인원과 비용을 추가하세요.</p>';
            return;
        }

        // Create table
        const table = document.createElement('table');
        table.className = 'table table-bordered table-sm';

        // Create table header (members as columns)
        const thead = document.createElement('thead');
        let headerRowHtml = '<tr><th>비용 내역</th>';
        members.forEach(member => {
            headerRowHtml += `<th>${member}</th>`;
        });
        headerRowHtml += '<th>총 비용</th></tr>'; // 총 비용 열 추가
        thead.innerHTML = headerRowHtml;
        table.appendChild(thead);

        // Create table body (expenses as rows)
        const tbody = document.createElement('tbody');
        expenses.forEach(expense => {
            let expenseRowHtml = `<tr><td>${expense.description} (${expense.amount.toLocaleString()}원)</td>`;
            members.forEach(member => {
                const splitAmount = expense.amount / expense.participants.length;
                if (expense.participants.includes(member)) {
                    expenseRowHtml += `<td>${Math.round(splitAmount).toLocaleString()}원</td>`;
                } else {
                    expenseRowHtml += `<td>-</td>`; // Not a participant in this expense
                }
            });
            expenseRowHtml += `<td>${expense.amount.toLocaleString()}원</td></tr>`; // 총 비용 값 추가
            tbody.innerHTML += expenseRowHtml;
        });
        // Add total row
        let totalRowHtml = '<tr><td><b>총 부담 금액</b></td>';
        members.forEach(member => {
            let memberTotalExpense = 0;
            expenses.forEach(expense => {
                const splitAmount = expense.amount / expense.participants.length;
                if (expense.participants.includes(member)) {
                    memberTotalExpense += splitAmount;
                }
            });
            totalRowHtml += `<td><b>${Math.round(memberTotalExpense).toLocaleString()}원</b></td>`;
        });
        totalRowHtml += `<td><b>${Math.round(expenses.reduce((sum, exp) => sum + exp.amount, 0)).toLocaleString()}원</b></td></tr>`; // 전체 총 비용
        tbody.innerHTML += totalRowHtml;

        table.appendChild(tbody);

        excelSummaryArea.appendChild(table);
    }

    function addEditDeleteListeners() {
        document.querySelectorAll('.delete-expense').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToDelete = parseInt(e.target.dataset.index, 10);
                expenses.splice(indexToDelete, 1);
                calculateAndRenderResults();
            });
        });

        document.querySelectorAll('.edit-expense').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToEdit = parseInt(e.target.dataset.index, 10);
                const expense = expenses[indexToEdit];
                editingExpenseIndex = indexToEdit;
                expenseDescriptionInput.value = expense.description;
                expenseAmountInput.value = expense.amount;
                document.querySelectorAll('#expense-members input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = expense.participants.includes(checkbox.value);
                });
                addExpenseButton.textContent = '비용 수정';
                addExpenseButton.classList.replace('btn-success', 'btn-warning');
                window.scrollTo(0, 0);
            });
        });
    }

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const loadName = urlParams.get('load');
    if (loadName) {
        loadDataFromLocalStorage(loadName);
    } else {
        members = [];
        expenses = [];
        renderMembers();
        renderExpenseMembers();
        calculateAndRenderResults();
    }
});