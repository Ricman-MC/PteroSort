// ==UserScript==
// @name         PteroSort
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Pterodactyl server sorter
// @homepage     https://github.com/Ricman-MC/PteroSort
// @author       Ricman
// @match        https://panel.your-server.eu/
// @match        https://panel.your-second-server.com/
// @grant        none
// ==/UserScript==

// IMPORTANT
// Set your own domain for the pterodactyl panel in the @match example is provided you can add as many as you need
// Script supports only vanilla pterodactyl panel v.1.11.10 (its possible it will work on diferent versions not tested)
// IMPORTANT


// this script has some hardcoded parts i expect it will break when update comes iam fixing this in later updates
// In development second script that has also category sorting, basically create category and assaign it to server

(function () {
    'use strict';

    const STORAGE_KEY_YOURS = 'ptero_server_order_yours';
    const STORAGE_KEY_OTHERS = 'ptero_server_order_others';
    const containerSelector = 'section > div';
    const serverSelector = '.DashboardContainer___StyledServerRow-sc-1topkxf-2';
    const toggleSelector = 'input[name="show_all_servers"]';
    const buttonContainerSelector = '.DashboardContainer___StyledDiv-sc-1topkxf-0';

    let autoSaveEnabled = localStorage.getItem('autoSaveEnabled') !== 'false';
    let dragLockEnabled = localStorage.getItem('dragLockEnabled') === 'true';

    function getStorageKey() {
        return document.querySelector(toggleSelector)?.checked ? STORAGE_KEY_OTHERS : STORAGE_KEY_YOURS;
    }

    function saveOrder() {
        if (!autoSaveEnabled) return;

        const serverElements = document.querySelectorAll(serverSelector);
        const order = Array.from(serverElements).map(el => el.href.split('/').pop());
        localStorage.setItem(getStorageKey(), JSON.stringify(order));
    }

    function loadOrder() {
        const savedOrder = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
        if (!savedOrder.length) return;

        const container = document.querySelector(containerSelector);
        const servers = Array.from(document.querySelectorAll(serverSelector));
        const serverMap = new Map(servers.map(el => [el.href.split('/').pop(), el]));

        savedOrder.forEach(id => {
            if (serverMap.has(id)) {
                container.appendChild(serverMap.get(id));
            }
        });
    }

    function enableDragAndDrop() {
        const container = document.querySelector(containerSelector);
        if (!container) return;
    
        let dragged = null;
    
        // reset all drag listeners
        document.querySelectorAll(serverSelector).forEach(el => {
            el.draggable = !dragLockEnabled;
    
            el.removeEventListener('dragstart', handleDragStart);
            el.removeEventListener('dragover', handleDragOver);
            el.removeEventListener('drop', handleDrop);
    
            if (!dragLockEnabled) {
                el.addEventListener('dragstart', handleDragStart);
                el.addEventListener('dragover', handleDragOver);
                el.addEventListener('drop', handleDrop);
            }
        });
    
        function handleDragStart(e) {
            if (dragLockEnabled) return;
            dragged = e.target;
            e.dataTransfer.effectAllowed = 'move';
        }
    
        function handleDragOver(e) {
            if (dragLockEnabled) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
    
            const target = e.target.closest(serverSelector);
            if (!target || target === dragged) return;
    
            const bounding = target.getBoundingClientRect();
            const offset = e.clientY - bounding.top;
    
            if (offset > bounding.height * 0.1) {
                target.parentNode.insertBefore(dragged, target);
            } else if (offset < bounding.height * 0.9) {
                target.parentNode.insertBefore(dragged, target.nextSibling);
            }


        }
    
        function handleDrop(e) {
            if (dragLockEnabled) return;
            e.preventDefault();
            saveOrder();
            fixSpacing();
        }
    }




    function fixSpacing() {
        document.querySelectorAll(serverSelector).forEach(el => {
            el.style.marginTop = '8px';
        });
    }

    function createButtons() {
        const container = document.querySelector(buttonContainerSelector);
        const toggleSwitch = document.querySelector(toggleSelector);

        if (!container || !toggleSwitch) return; // make sure elements exist

        // prevent duplicate buttons
        if (document.getElementById('lockDragButton')) return;

        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.gap = '10px';
        buttonWrapper.style.paddingLeft = '15px';
        buttonWrapper.style.paddingRight = '15px';
        buttonWrapper.style.float = 'right';

        const lockButton = document.createElement('button');
        lockButton.id = 'lockDragButton';
        lockButton.title = 'Toggle drag lock';
        lockButton.style.padding = '5px 10px';
        lockButton.style.cursor = 'pointer';
        lockButton.innerText = dragLockEnabled ? '🔒' : '🔓';
        lockButton.addEventListener('click', () => {
            dragLockEnabled = !dragLockEnabled;
            localStorage.setItem('dragLockEnabled', dragLockEnabled);
            lockButton.innerText = dragLockEnabled ? '🔒' : '🔓';

            enableDragAndDrop();


        });

        const autoSaveButton = document.createElement('button');
        autoSaveButton.id = 'autoSaveButton';
        autoSaveButton.title = 'Toggle auto-saving';
        autoSaveButton.style.padding = '5px 10px';
        autoSaveButton.style.cursor = 'pointer';
        autoSaveButton.innerText = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
        autoSaveButton.addEventListener('click', () => {
            autoSaveEnabled = !autoSaveEnabled;
            localStorage.setItem('autoSaveEnabled', autoSaveEnabled);
            autoSaveButton.innerText = `Auto-Save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
        });

        const clearButton = document.createElement('button');
        clearButton.id = 'clearStorageButton';
        clearButton.title = 'Delete all saved server orders';
        clearButton.style.marginRight = '10px';
        clearButton.style.padding = '5px 10px';
        clearButton.style.cursor = 'pointer';
        clearButton.style.color = 'red';
        clearButton.innerText = '🗑️';

        // click event - show confirmation overlay
        clearButton.addEventListener('click', () => {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0, 0, 0, 0.5)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '10000';

            const confirmation = document.createElement('div');
            confirmation.style.padding = '20px';
            confirmation.style.background = 'white';
            confirmation.style.boxShadow = '0px 4px 6px rgba(0,0,0,0.1)';
            confirmation.style.borderRadius = '10px';
            confirmation.style.textAlign = 'center';

            confirmation.innerHTML = `
                <p style="margin-bottom: 15px; color: black;">Are you sure you want to delete all saved server orders?</p>
                <button id="confirmDelete" style="margin-right: 10px; padding: 5px 10px; border-radius: 5px; background: red; color: white; border: none; cursor: pointer;">Yes</button>
                <button id="cancelDelete" style="padding: 5px 10px; border-radius: 5px; background: gray; color: white; border: none; cursor: pointer;">No</button>
            `;

            overlay.appendChild(confirmation);
            document.body.appendChild(overlay);

            document.getElementById('confirmDelete').addEventListener('click', () => {
                localStorage.removeItem(STORAGE_KEY_YOURS);
                localStorage.removeItem(STORAGE_KEY_OTHERS);
                overlay.remove();
                location.reload(); // refresh the page
            });

            document.getElementById('cancelDelete').addEventListener('click', () => {
                overlay.remove();
            });

            // close overlay when clicking outside the confirmation box
            overlay.addEventListener('click', () => {
                overlay.remove();
            });

            // prevent clicking inside the box from closing the overlay
            confirmation.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        container.appendChild(clearButton);

        buttonWrapper.appendChild(lockButton);
        buttonWrapper.appendChild(autoSaveButton);

        const toggleContainer = toggleSwitch.closest('.Switch___StyledDiv-sc-1nxt82m-2');

        if (toggleContainer && toggleContainer.contains(toggleSwitch)) {
            toggleContainer.appendChild(buttonWrapper);
        } else {
            console.warn('Could not find valid toggle container, appending buttons at the end.');
            container.appendChild(buttonWrapper);
        }
    }




    function init() {
        loadOrder();
        enableDragAndDrop();
        fixSpacing();
        createButtons();
    }

    function observePageChanges() {
        let lastUrl = location.href;
        let lastPath = location.pathname;
    
        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
            }
    
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
    
                waitForElement(serverSelector, () => {
                    init()
                });
            }
        });
    
        observer.observe(document.body, { childList: true, subtree: true });
    
        // interval-based fallback
        setInterval(() => {
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
                waitForElement(serverSelector, () => {
                    // init() sometimes does not work
                    loadOrder();
                    enableDragAndDrop();
                    fixSpacing();
                    createButtons();
                });
            }
        }, 500);
    }




    function observeViewSwitch() {
        const toggleSwitch = document.querySelector(toggleSelector);
        if (toggleSwitch) {
            toggleSwitch.addEventListener('change', () => {
                setTimeout(() => { // delay to avoid using old elements
                    waitForElement(serverSelector, () => {
                        loadOrder();
                        enableDragAndDrop();
                        fixSpacing();
                    });
                }, 200);
            });
        }
    }



    function waitForElement(selector, callback) {
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                callback();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    waitForElement(serverSelector, () => {
        init();
        observePageChanges();
        observeViewSwitch();
    });
})();
