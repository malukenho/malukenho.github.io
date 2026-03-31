const EXAMINATIONS = {
    daily: {
        title: "Daily Examination",
        categories: [
            {
                name: "God (1-3)",
                sins: [
                    { id: 'daily_1', text: "Did I omit my daily prayers?" },
                    { id: 'daily_2', text: "Did I put other things (work, hobbies) before God today?" },
                    { id: 'daily_3', text: "Did I use God's name in vain or curse?" }
                ]
            },
            {
                name: "Neighbour (4-10)",
                sins: [
                    { id: 'daily_4', text: "Was I impatient or angry with others?" },
                    { id: 'daily_5', text: "Did I gossip or speak unkindly of someone?" },
                    { id: 'daily_6', text: "Was I lazy or did I neglect my duties?" },
                    { id: 'daily_7', text: "Did I indulge in impure thoughts or actions?" },
                    { id: 'daily_8', text: "Did I lie or cheat?" }
                ]
            }
        ]
    },
    monthly: {
        title: "Monthly Examination",
        categories: [
            {
                name: "1st-3rd Commandments",
                sins: [
                    { id: 'm_1', text: "Have I neglected my relationship with God?" },
                    { id: 'm_2', text: "Have I missed Mass on Sundays or Holy Days?" },
                    { id: 'm_3', text: "Have I used God's name profanely?" },
                    { id: 'm_4', text: "Have I trusted more in myself than in God?" }
                ]
            },
            {
                name: "4th-10th Commandments",
                sins: [
                    { id: 'm_5', text: "Have I been disrespectful to my family or superiors?" },
                    { id: 'm_6', text: "Have I harbored resentment or refused to forgive?" },
                    { id: 'm_7', text: "Have I been unchaste in my thoughts, words, or actions?" },
                    { id: 'm_8', text: "Have I taken anything that was not mine?" },
                    { id: 'm_9', text: "Have I lied or gossiped?" }
                ]
            }
        ]
    },
    general: {
        title: "Comprehensive Examination",
        categories: [
            {
                name: "I: I am the Lord thy God...",
                sins: [
                    { id: 'g_1', text: "Do I pray daily? Do I seek to know God better?" },
                    { id: 'g_2', text: "Have I practiced any form of superstition or occultism?" },
                    { id: 'g_3', text: "Have I been indifferent to the faith or ashamed of it?" }
                ]
            },
            {
                name: "II: Thou shalt not take the Name...",
                sins: [
                    { id: 'g_4', text: "Have I used the Holy Name of God with disrespect or in anger?" },
                    { id: 'g_5', text: "Have I made false oaths or broken promises to God?" }
                ]
            },
            {
                name: "III: Keep holy the Sabbath Day",
                sins: [
                    { id: 'g_6', text: "Have I missed Mass on Sundays or Holy Days through my own fault?" },
                    { id: 'g_7', text: "Have I performed unnecessary work on Sundays?" }
                ]
            },
            {
                name: "IV: Honour thy father and thy mother",
                sins: [
                    { id: 'g_8', text: "Have I been disrespectful to my parents or elders?" },
                    { id: 'g_9', text: "Have I neglected my duties to my children/spouse?" }
                ]
            },
            {
                name: "V: Thou shalt not kill",
                sins: [
                    { id: 'g_10', text: "Have I been angry, resentful, or harbored hatred?" },
                    { id: 'g_11', text: "Have I encouraged or participated in any form of violence?" },
                    { id: 'g_12', text: "Have I been guilty of the sin of scandal (leading others to sin)?" }
                ]
            },
            {
                name: "VI & IX: Purity",
                sins: [
                    { id: 'g_13', text: "Have I been unchaste in thoughts, words, or actions?" },
                    { id: 'g_14', text: "Have I watched pornography or immodest entertainment?" }
                ]
            },
            {
                name: "VII & X: Stealing & Envy",
                sins: [
                    { id: 'g_15', text: "Have I taken anything from another without permission?" },
                    { id: 'g_16', text: "Have I been greedy or envious of others' possessions?" },
                    { id: 'g_17', text: "Have I cheated in business or at school?" }
                ]
            },
            {
                name: "VIII: False Witness",
                sins: [
                    { id: 'g_18', text: "Have I lied? Have I exaggerated to make myself look better?" },
                    { id: 'g_19', text: "Have I gossiped or revealed the faults of others?" }
                ]
            }
        ]
    }
};

class RepentApp {
    constructor() {
        this.storageKey = 'repent_app_data';
        this.data = this.loadData();
        this.currentScreen = 'home';
        this.examResults = {};
        
        window.addEventListener('load', () => this.init());
    }

    loadData() {
        const defaultData = {
            currentSins: [], // { sinId, text, count, notes, timestamp }
            history: [],     // { id, timestamp, sins }
            lastConfessionDate: null
        };
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : defaultData;
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    init() {
        this.setScreen('home');
    }

    setScreen(screen) {
        this.currentScreen = screen;
        const container = document.getElementById('screen-container');
        const template = document.getElementById(`tpl-${screen}`);
        
        container.innerHTML = '';
        container.appendChild(template.content.cloneNode(true));
        
        // Update nav
        document.querySelectorAll('.app-nav button').forEach(btn => {
            btn.classList.toggle('active', btn.id === `nav-${screen}`);
        });

        this.renderScreen();
    }

    renderScreen() {
        if (this.currentScreen === 'home') {
            this.renderHome();
        } else if (this.currentScreen === 'prep') {
            this.renderPrep();
        } else if (this.currentScreen === 'history') {
            this.renderHistory();
        }
    }

    renderHome() {
        const lastDate = this.data.lastConfessionDate;
        const dateEl = document.getElementById('last-confession-date');
        const daysEl = document.getElementById('days-since-last');
        
        if (lastDate) {
            const date = new Date(lastDate);
            dateEl.textContent = date.toLocaleDateString();
            const diff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
            daysEl.textContent = `Days since: ${diff}`;
        }

        document.getElementById('current-sin-count').textContent = this.data.currentSins.length;

        const list = document.getElementById('recent-logs-list');
        list.innerHTML = '';
        this.data.currentSins.slice(-5).reverse().forEach(sin => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${sin.text}</strong> <span class="count">${sin.count > 1 ? 'x'+sin.count : ''}</span>`;
            list.appendChild(li);
        });
    }

    showQuickAdd() {
        document.getElementById('quick-add-form').classList.remove('hidden');
    }

    hideQuickAdd() {
        document.getElementById('quick-add-form').classList.add('hidden');
    }

    submitQuickAdd() {
        const text = document.getElementById('quick-sin-text').value;
        const count = parseInt(document.getElementById('quick-sin-count').value) || 1;
        
        if (!text) {
            alert("Please enter a sin description.");
            return;
        }

        this.data.currentSins.push({
            sinId: 'quick_' + Date.now(),
            text,
            count,
            notes: '',
            timestamp: Date.now()
        });

        this.saveData();
        this.renderHome();
        this.hideQuickAdd();
        document.getElementById('quick-sin-text').value = '';
        document.getElementById('quick-sin-count').value = '1';
    }

    startExamination(mode) {
        const config = EXAMINATIONS[mode];
        const content = document.getElementById('examination-content');
        content.classList.remove('hidden');
        document.querySelector('.examine-modes').classList.add('hidden');
        
        document.getElementById('exam-title').textContent = config.title;
        const categoriesContainer = document.getElementById('exam-categories');
        categoriesContainer.innerHTML = '';

        this.examResults = {};

        config.categories.forEach(cat => {
            const catDiv = document.createElement('div');
            catDiv.className = 'exam-category';
            catDiv.innerHTML = `<h4>${cat.name}</h4>`;
            
            cat.sins.forEach(sin => {
                const sinDiv = document.createElement('div');
                sinDiv.className = 'exam-item';
                sinDiv.innerHTML = `
                    <label>
                        <input type="checkbox" onchange="app.toggleExamSin('${sin.id}', '${sin.text}', this.checked)">
                        ${sin.text}
                    </label>
                    <div class="sin-controls hidden" id="controls-${sin.id}">
                        <input type="number" value="1" min="1" onchange="app.updateExamSinCount('${sin.id}', this.value)" placeholder="Qty">
                        <input type="text" onchange="app.updateExamSinNotes('${sin.id}', this.value)" placeholder="Notes">
                    </div>
                `;
                catDiv.appendChild(sinDiv);
            });
            categoriesContainer.appendChild(catDiv);
        });
    }

    toggleExamSin(id, text, checked) {
        const controls = document.getElementById(`controls-${id}`);
        if (checked) {
            controls.classList.remove('hidden');
            this.examResults[id] = { id, text, count: 1, notes: '' };
        } else {
            controls.classList.add('hidden');
            delete this.examResults[id];
        }
    }

    updateExamSinCount(id, val) {
        if (this.examResults[id]) this.examResults[id].count = parseInt(val) || 1;
    }

    updateExamSinNotes(id, val) {
        if (this.examResults[id]) this.examResults[id].notes = val;
    }

    saveExamination() {
        const sinsToAdd = Object.values(this.examResults);
        if (sinsToAdd.length === 0) {
            alert("No sins selected. If you have nothing to confess, praise God!");
            this.setScreen('home');
            return;
        }

        sinsToAdd.forEach(sin => {
            this.data.currentSins.push({
                ...sin,
                timestamp: Date.now()
            });
        });

        this.saveData();
        this.setScreen('prep');
    }

    renderPrep() {
        const container = document.getElementById('prep-list-container');
        if (this.data.currentSins.length === 0) {
            container.innerHTML = '<p class="empty-msg">Your list is empty. Complete an examination to start.</p>';
            return;
        }

        // Group same sins
        const grouped = {};
        this.data.currentSins.forEach(sin => {
            if (!grouped[sin.text]) {
                grouped[sin.text] = { ...sin, instances: 1 };
            } else {
                grouped[sin.text].count += sin.count;
                grouped[sin.text].instances++;
            }
        });

        container.innerHTML = '<ul class="prep-list"></ul>';
        const ul = container.querySelector('ul');

        Object.values(grouped).forEach(sin => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="sin-info">
                    <span class="sin-text">${sin.text}</span>
                    <span class="sin-count">${sin.count > 0 ? 'Frequency: ' + sin.count : ''}</span>
                    ${sin.notes ? `<p class="sin-notes">${sin.notes}</p>` : ''}
                </div>
                <button class="remove-btn" onclick="app.removeSin('${sin.text}')">&times;</button>
            `;
            ul.appendChild(li);
        });
    }

    removeSin(text) {
        this.data.currentSins = this.data.currentSins.filter(s => s.text !== text);
        this.saveData();
        this.renderPrep();
    }

    finishConfession() {
        if (!confirm("Are you sure you want to complete this confession session? All listed sins will be moved to history.")) return;
        
        const session = {
            id: Date.now(),
            timestamp: Date.now(),
            sins: [...this.data.currentSins]
        };

        this.data.history.push(session);
        this.data.currentSins = [];
        this.data.lastConfessionDate = Date.now();
        
        this.saveData();
        this.setScreen('history');
    }

    renderHistory() {
        const container = document.getElementById('history-list');
        if (this.data.history.length === 0) {
            container.innerHTML = '<p class="empty-msg">No past confessions recorded.</p>';
            return;
        }

        this.data.history.slice().reverse().forEach(session => {
            const div = document.createElement('div');
            div.className = 'history-item';
            const date = new Date(session.timestamp).toLocaleString();
            div.innerHTML = `
                <div class="history-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <span>${date}</span>
                    <span>${session.sins.length} items</span>
                </div>
                <div class="history-details hidden">
                    <ul>
                        ${session.sins.map(s => `<li>${s.text} ${s.count > 1 ? '(x'+s.count+')' : ''}</li>`).join('')}
                    </ul>
                    <button class="delete-history-btn" onclick="app.deleteHistory(${session.id})">Delete Record</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    deleteHistory(id) {
        if (!confirm("Permanently delete this record?")) return;
        this.data.history = this.data.history.filter(h => h.id !== id);
        this.saveData();
        this.renderHistory();
    }
}

const app = new RepentApp();
