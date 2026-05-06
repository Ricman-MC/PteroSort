// ==UserScript==
// @name         PteroSort Category
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Pterodactyl server sorter with categories
// @homepage     https://github.com/Ricman-MC/PteroSort
// @author       Ricman
// @license      Apache 2.0
// @match        https://panel.your-server.eu/*
// @match        https://panel.your-second-server.com/*
// @grant        none
// ==/UserScript==

// IMPORTANT
// To make this script work on your Pterodactyl panel, you need to add the panel's full URL manually.
// Go to Tampermonkey dashboard → click the script name → Settings tab → look for Includes/Excludes → User matches → click Add...
// Then add the full HTTPS URL of your panel there (e.g., https://panel.your-server.eu/*)
// You can add multiple panel URLs if needed.
// This version supports vanilla pterodactyl panel v1.12.2
// You need to have at least one server in Pterodactyl in order for the script to load.
// IMPORTANT

// this script has some hardcoded parts it could break when update of pterodactyl panel comes (and it indeed did break when update of ui came :D)



(function () {
    'use strict';

    const STORAGE_KEY_YOURS = 'ptero_server_order_yours_v2';
    const STORAGE_KEY_OTHERS = 'ptero_server_order_others_v2';
    const STORAGE_KEY_CATEGORIES_YOURS = 'ptero_categories_yours_v2';
    const STORAGE_KEY_CATEGORIES_OTHERS = 'ptero_categories_others_v2';
    const containerSelector = 'section > div';
    const serverSelector = '.DashboardContainer___StyledServerRow-sc-1topkxf-2';
    const categoryRowClass = 'dashboard-category-row';
    const categoryColorStripeClass = 'category-color-stripe';
    const collapsedCategoryClass = 'collapsed-category';
    const categoryStoragePrefix = 'category_';
    const toggleSelector = 'input[name="show_all_servers"]';
    const buttonContainerSelector = '.DashboardContainer___StyledDiv-sc-1topkxf-0';


    const DEBUG_DRAG = false;

    let dragLockEnabled = localStorage.getItem('dragLockEnabled') === 'true';
    let categories = [];

    function isDashboardPage() {
        return window.location.pathname === '/' || window.location.pathname === '';
    }

    let _serverWaitObserver = null;
    let _serverWaitTimeout = null;

    function getStorageKey() {
        return document.querySelector(toggleSelector)?.checked ? STORAGE_KEY_OTHERS : STORAGE_KEY_YOURS;
    }

    function getCategoryStorageKey() {
        return document.querySelector(toggleSelector)?.checked ? STORAGE_KEY_CATEGORIES_OTHERS : STORAGE_KEY_CATEGORIES_YOURS;
    }

    function generateCategoryId() {
        return categoryStoragePrefix + Math.random().toString(36).substring(2, 15);
    }

    function saveCategories() {
        localStorage.setItem(getCategoryStorageKey(), JSON.stringify(categories));
    }

    function loadCategories() {
        categories = JSON.parse(localStorage.getItem(getCategoryStorageKey()) || '[]');
    }

    function saveOrder() {

        const container = document.querySelector(containerSelector);
        if (!container) return;

        const order = [];
        for (const child of container.children) {

            if (child.matches(serverSelector) && !child.classList.contains(categoryRowClass)) {
                order.push({ type: 'server', id: child.href.split('/').pop(), categoryId: child.dataset.categoryId || null });
            } else if (child.classList.contains(categoryRowClass)) {
                order.push({ type: 'category', id: child.dataset.categoryId });
            }
        }
        localStorage.setItem(getStorageKey(), JSON.stringify(order));
        saveCategories();
    }

    function loadOrder() {
        loadCategories();

        const savedOrder = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');

        const container = document.querySelector(containerSelector);
        if (!container) return;

        const servers = Array.from(document.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})`));
        const serverMap = new Map(servers.map(el => [el.href.split('/').pop(), el]));
        const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

        const existingRows = container.querySelectorAll(`${serverSelector}, .${categoryRowClass}`);
        console.log(`PteroSort: Removing ${existingRows.length} existing server/category rows before loading.`);
        existingRows.forEach(row => row.remove());

        const placedServerIds = new Set();

        savedOrder.forEach(item => {
            if (item.type === 'server') {
                if (serverMap.has(item.id)) {
                    const serverElement = serverMap.get(item.id);
                    serverElement.dataset.categoryId = item.categoryId || '';
                    container.appendChild(serverElement);
                    placedServerIds.add(item.id);
                }
            } else if (item.type === 'category') {
                if (categoryMap.has(item.id)) {
                    container.appendChild(createCategoryElement(categoryMap.get(item.id)));
                }
            }
        });

        servers.forEach(serverElement => {
            const serverId = serverElement.href.split('/').pop();
            if (!placedServerIds.has(serverId)) {
                serverElement.dataset.categoryId = '';
                container.appendChild(serverElement);
            }
        });
    }

    function createCategoryElement(categoryData) {
        const categoryElement = document.createElement('a');

        categoryElement.className = `GreyRowBox-sc-1xo9c6v-0 ServerRow__StatusIndicatorBox-sc-1ibsw91-2 ctzaNX eBEJmu DashboardContainer___StyledServerRow-sc-1topkxf-2 cbzuKl ${categoryRowClass}`;

        categoryElement.draggable = !dragLockEnabled;
        categoryElement.dataset.categoryId = categoryData.id;
        categoryElement.style.marginTop = '8px';
        categoryElement.style.cursor = 'grab';

        categoryElement.innerHTML = `
            <div class="${categoryColorStripeClass}" style="background-color: ${categoryData.color};"></div>
            <div class="ServerRow___StyledDiv-sc-1ibsw91-3 gsHZSB" style="margin-left: 20px; display:flex; align-items:center; justify-content: flex-start; flex-grow: 1;">
                <p class="ServerRow___StyledP-sc-1ibsw91-4 MbXRy" style="font-weight: bold;">${categoryData.name}</p>
            </div>
            <div class="ServerRow___StyledDiv4-sc-1ibsw91-10 ghEivn category-controls" style="justify-content: flex-end; margin-right: 10px; display:flex; align-items:center; margin-left: auto;">
                <div class="ServerRow___StyledDiv10-sc-1ibsw91-19 juhRZD category-description-wrapper" style="align-items: center; display:flex; text-align: right; margin-right: 8px;">
                    <p class="ServerRow__IconDescription-sc-1ibsw91-1 buFsKz category-description" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 600px; color: #a7b4c0; font-size: 0.9em;">${categoryData.description || ''}</p>
                </div>
                <div class="category-collapse-wrapper" style="padding: 5px; cursor: pointer;">
                    <svg class="category-collapse-icon" viewBox="0 0 24 24" style="width: 1.5em; height: 1.5em; display: block; transition: transform 0.2s ease-in-out;">
                        <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                    </svg>
                </div>
            </div>
        `;

        const editButtonWrapper = document.createElement('div');
        editButtonWrapper.className = 'category-edit-wrapper';
        editButtonWrapper.style.justifyContent = 'flex-end';
        editButtonWrapper.style.marginLeft = 'auto';
        editButtonWrapper.style.display = 'flex';
        editButtonWrapper.style.alignItems = 'center';
        editButtonWrapper.style.flexShrink = '0';

        const editButtonInner = document.createElement('div');
        editButtonInner.className = 'ServerRow___StyledDiv11-sc-1ibsw91-21 iELGrp';
        editButtonInner.style.backgroundColor = 'rgb(59, 130, 246)';
        editButtonInner.style.padding = '4px';
        editButtonInner.style.borderRadius = '4px';
        editButtonInner.style.cursor = 'pointer';
        editButtonInner.style.display = 'flex';
        editButtonInner.style.alignItems = 'center';
        editButtonInner.style.justifyContent = 'center';
        editButtonInner.title = 'Edit Category';

        const editIconDiv = document.createElement('div');
        editIconDiv.className = 'ServerRow___StyledDiv12-sc-1ibsw91-22';
        editIconDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white" width="18px" height="18px">
                <path d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z"/>
            </svg>
        `;

        editButtonInner.appendChild(editIconDiv);
        editButtonWrapper.appendChild(editButtonInner);

        const controlsContainer = categoryElement.querySelector('.category-controls');
        if (controlsContainer) {
            controlsContainer.appendChild(editButtonWrapper);
        } else {
            console.error("PteroSort: Could not find controls container to append edit button.");
        }

        editButtonWrapper.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openCategoryOverlay(categoryData);
        });

        const deleteButtonWrapper = document.createElement('div');
        deleteButtonWrapper.className = 'category-delete-wrapper';
        deleteButtonWrapper.style.justifyContent = 'flex-end';
        deleteButtonWrapper.style.marginLeft = '10px';
        deleteButtonWrapper.style.display = 'flex';
        deleteButtonWrapper.style.alignItems = 'center';
        deleteButtonWrapper.style.flexShrink = '0';

        const deleteButtonInner = document.createElement('div');
        deleteButtonInner.className = 'ServerRow___StyledDiv11-sc-1ibsw91-21 iELGrp';
        deleteButtonInner.style.backgroundColor = 'rgb(239, 68, 68)';
        deleteButtonInner.style.padding = '4px';
        deleteButtonInner.style.borderRadius = '4px';
        deleteButtonInner.style.cursor = 'pointer';
        deleteButtonInner.style.display = 'flex';
        deleteButtonInner.style.alignItems = 'center';
        deleteButtonInner.style.justifyContent = 'center';
        deleteButtonInner.title = 'Delete Category';

        const deleteIconDiv = document.createElement('div');
        deleteIconDiv.className = 'ServerRow___StyledDiv12-sc-1ibsw91-22';
        deleteIconDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18px" height="18px">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `;

        deleteButtonInner.appendChild(deleteIconDiv);
        deleteButtonWrapper.appendChild(deleteButtonInner);

        if (controlsContainer) {
            controlsContainer.appendChild(deleteButtonWrapper);
        } else {
            console.error("PteroSort: Could not find controls container to append delete button.");
        }

        deleteButtonWrapper.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            showDeleteConfirmation(deleteButtonWrapper, categoryData);
        });

        function showDeleteConfirmation(buttonWrapper, catData) {
            buttonWrapper.style.display = 'none';

            const confirmWrapper = document.createElement('div');
            confirmWrapper.className = 'category-delete-confirm';
            confirmWrapper.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:10px;flex-shrink:0;';

            const confirmText = document.createElement('span');
            confirmText.textContent = 'Delete?';
            confirmText.style.cssText = 'color:#a7b4c0;font-size:0.85em;font-weight:bold;white-space:nowrap;';

            const checkButton = document.createElement('div');
            checkButton.style.cssText = 'background-color:rgb(22, 163, 74);padding:4px;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
            checkButton.title = 'Confirm Delete';
            checkButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;

            const cancelButton = document.createElement('div');
            cancelButton.style.cssText = 'background-color:rgb(107, 114, 128);padding:4px;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
            cancelButton.title = 'Cancel';
            cancelButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;

            confirmWrapper.appendChild(confirmText);
            confirmWrapper.appendChild(checkButton);
            confirmWrapper.appendChild(cancelButton);

            buttonWrapper.parentNode.appendChild(confirmWrapper);

            checkButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmWrapper.remove();
                deleteCategory(categoryData.id, categoryData.name);
            });

            cancelButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmWrapper.remove();
                buttonWrapper.style.display = 'flex';
            });
        }

        categoryElement.addEventListener('click', (event) => {

            if (!event.target.closest('.category-delete-wrapper') && !event.target.closest('.category-edit-wrapper') && !event.target.closest('.category-delete-confirm')) {
                 event.preventDefault();
                 toggleCategoryCollapse(categoryElement, categoryData.id, collapseIconSvg);
            }
        });

        const collapseWrapper = categoryElement.querySelector('.category-collapse-wrapper');
        const collapseIconSvg = categoryElement.querySelector('.category-collapse-icon');
        collapseWrapper.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleCategoryCollapse(categoryElement, categoryData.id, collapseIconSvg);
        });

        if (categoryData.collapsed) {
            categoryElement.classList.add(collapsedCategoryClass);
            collapseCategoryVisual(categoryElement, collapseIconSvg);

        }

        return categoryElement;
    }

    function toggleCategoryCollapse(categoryElement, categoryId, collapseIcon) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const isCollapsed = categoryElement.classList.contains(collapsedCategoryClass);
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return;

        if (isCollapsed) {
            expandCategoryVisual(categoryElement, collapseIcon);
            categoryElement.classList.remove(collapsedCategoryClass);
            category.collapsed = false;

            moveServersBelowCategory(categoryElement);

            for (const child of container.children) {
                if (child.matches(serverSelector) && !child.classList.contains(categoryRowClass) && child.dataset.categoryId === categoryId) {
                    child.style.display = '';
                }
            }
        } else {
            collapseCategoryVisual(categoryElement, collapseIcon);
            categoryElement.classList.add(collapsedCategoryClass);
            category.collapsed = true;

            for (const child of container.children) {
                if (child.matches(serverSelector) && !child.classList.contains(categoryRowClass) && child.dataset.categoryId === categoryId) {
                    child.style.display = 'none';
                }
            }
        }
        saveCategories();
        fixSpacing();
    }

    function collapseCategoryVisual(categoryElement, collapseIcon) {
        if (collapseIcon) {
            collapseIcon.style.transform = 'rotate(-90deg)';
        }
    }

    function expandCategoryVisual(categoryElement, collapseIcon) {
        if (collapseIcon) {
            collapseIcon.style.transform = 'rotate(0deg)';
        }
    }

    function deleteCategory(categoryId, categoryName) {
        categories = categories.filter(cat => cat.id !== categoryId);

        const categoryElement = document.querySelector(`.${categoryRowClass}[data-category-id="${categoryId}"]`);
        if (categoryElement) categoryElement.remove();

        const serversToUnassign = document.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})[data-category-id="${categoryId}"]`);
        serversToUnassign.forEach(server => {
            delete server.dataset.categoryId;

            server.querySelector('.server-category-indicator')?.remove();
            server.style.marginLeft = '0px';
            server.style.display = '';
        });

        saveCategories();
        saveOrder();
        fixSpacing();
        enableDragAndDrop();
        console.log(`PteroSort: Deleted category ${categoryId}`);
    }

    function moveServersBelowCategory(categoryElement) {
        if (!categoryElement || !categoryElement.parentNode) {
            if (DEBUG_DRAG) console.log("PteroSort: moveServersBelowCategory - no element or parent");
            return;
        }
        const container = categoryElement.parentNode;
        const categoryId = categoryElement.dataset.categoryId;
        if (!categoryId) return;

        const serversToMove = Array.from(container.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})[data-category-id="${categoryId}"]`));
        if (DEBUG_DRAG) console.log("PteroSort: moveServersBelowCategory - categoryId:", categoryId, "servers found:", serversToMove.length);
        let anchorElement = categoryElement;
        serversToMove.forEach(server => {
            server.remove();
            container.insertBefore(server, anchorElement.nextSibling);
            anchorElement = server;
        });
    }

    function resolveCategoryFromPosition(serverElement) {
        const container = serverElement?.parentNode;
        if (!container) return '';

        let element = serverElement.previousElementSibling;
        while (element) {
            if (element.classList.contains(categoryRowClass)) {
                return element.dataset.categoryId;
            }
            if (element.matches(serverSelector) && !element.classList.contains(categoryRowClass)) {
                if (!element.dataset.categoryId) {
                    return '';
                }
            }
            element = element.previousElementSibling;
        }
        return '';
    }

    let dragged = null;
    let draggedType = null;

    function handleDragStart(e) {
        if (dragLockEnabled) {
            e.preventDefault();
            return;
        }

        dragged = e.target.closest(`${serverSelector}, .${categoryRowClass}`);
        if (!dragged) return;

        draggedType = dragged.classList.contains(categoryRowClass) ? 'category' : 'server';
        e.dataTransfer.effectAllowed = 'move';

        dragged.classList.add('dragging-active');

        try {
            e.dataTransfer.setData('text/plain', dragged.dataset.categoryId || dragged.href || 'dragged');
        } catch (err) {
            console.warn("Could not set drag data:", err);
        }

        if (draggedType === 'category') {
            if (!dragged.classList.contains(collapsedCategoryClass)) {
                setTimeout(() => {
                    if (dragged && dragged.classList.contains('dragging-active')) {
                        dragged.dataset.wasExpandedBeforeDrag = 'true';
                        toggleCategoryCollapse(dragged, dragged.dataset.categoryId, dragged.querySelector('.category-collapse-icon'));
                    }
                }, 0);
            }
        }
    }

    function handleDragOver(e) {
        if (dragLockEnabled || !dragged) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const target = e.target.closest(`${serverSelector}, .${categoryRowClass}`);
        if (!target || target === dragged) return;

        if (draggedType === 'category' && target.matches(serverSelector) &&
            target.dataset.categoryId === dragged.dataset.categoryId) {
            return;
        }

        const bounding = target.getBoundingClientRect();
        const offset = e.clientY - bounding.top;
        const middle = bounding.height / 2;

        let insertBefore = null;

        if (draggedType === 'category' && target.matches(serverSelector) &&
            target.dataset.categoryId && target.dataset.categoryId !== dragged.dataset.categoryId) {
            const container = target.parentNode;
            const targetCategoryId = target.dataset.categoryId;
            const targetCategoryRow = container.querySelector(`.${categoryRowClass}[data-category-id="${targetCategoryId}"]`);
            const targetCategoryServers = Array.from(container.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})[data-category-id="${targetCategoryId}"]`));
            const lastServer = targetCategoryServers.length > 0 ? targetCategoryServers[targetCategoryServers.length - 1] : null;

            if (targetCategoryRow && targetCategoryServers.length > 0) {
                const hoveredIndex = targetCategoryServers.indexOf(target);
                const threshold = Math.floor(targetCategoryServers.length / 2);
                insertBefore = hoveredIndex < threshold ? targetCategoryRow : lastServer.nextSibling;
            }
        }

        if (insertBefore === null) {
            insertBefore = offset < middle ? target : target.nextSibling;
        }

        let insertedElement = target.parentNode.insertBefore(dragged, insertBefore);

        if (draggedType === 'category') {
            if (DEBUG_DRAG) console.log("PteroSort: handleDragOver - target:", target.dataset.categoryId || target.href?.split('/').pop(), "insertedElement:", insertedElement?.dataset?.categoryId || insertedElement?.href?.split('/').pop());
            const container = insertedElement.parentNode;
            if (!container) return;

            const categoryId = insertedElement.dataset.categoryId;
            const serversToMove = Array.from(container.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})[data-category-id="${categoryId}"]`));

            let anchorElement = insertedElement;
            serversToMove.forEach(server => {
                container.insertBefore(server, anchorElement.nextSibling);
                anchorElement = server;
            });

            dragged._lastDropTarget = target;
            if (target.matches(serverSelector) && target.dataset.categoryId && target.dataset.categoryId !== dragged.dataset.categoryId) {
                const container = target.parentNode;
                const targetCategoryId = target.dataset.categoryId;
                const targetCategoryServers = Array.from(container.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})[data-category-id="${targetCategoryId}"]`));
                const hoveredIndex = targetCategoryServers.indexOf(target);
                const threshold = Math.floor(targetCategoryServers.length / 2);
                dragged._lastDropPosition = hoveredIndex < threshold ? 'before' : 'after';
            } else {
                dragged._lastDropPosition = offset < middle ? 'before' : 'after';
            }
        }

        if (draggedType === 'server') {
            dragged._lastDropTarget = target;
            dragged._lastDropPosition = offset < middle ? 'before' : 'after';
        }
    }

    function handleDrop(e) {
        if (DEBUG_DRAG) console.log("PteroSort: handleDrop called");
        if (dragLockEnabled || !dragged) return;
        e.preventDefault();
        e.stopPropagation();

        if (draggedType === 'server') {
            if (dragged._lastDropTarget) {
                const target = dragged._lastDropTarget;
                const position = dragged._lastDropPosition;
                if (DEBUG_DRAG) console.log("PteroSort: handleDrop - server restoring to target:", target.href?.split('/').pop() || target.dataset.categoryId, "position:", position);
                const insertBefore = position === 'before' ? target : target.nextSibling;
                target.parentNode.insertBefore(dragged, insertBefore);
                delete dragged._lastDropTarget;
                delete dragged._lastDropPosition;
            }
            const resolvedCategoryId = resolveCategoryFromPosition(dragged);
            if (resolvedCategoryId) {
                dragged.dataset.categoryId = resolvedCategoryId;
            } else {
                delete dragged.dataset.categoryId;
            }
            if (DEBUG_DRAG) console.log("PteroSort: handleDrop - server resolved categoryId:", resolvedCategoryId || '(none)');
        }

        if (draggedType === 'category') {
            if (dragged._lastDropTarget) {
                const target = dragged._lastDropTarget;
                const position = dragged._lastDropPosition;
                if (DEBUG_DRAG) console.log("PteroSort: handleDrop - restoring to last drop target:", target.dataset.categoryId || target.href?.split('/').pop(), "position:", position);

                let insertBefore;
                if (target.matches(serverSelector) && target.dataset.categoryId &&
                    target.dataset.categoryId !== dragged.dataset.categoryId) {
                    const container = target.parentNode;
                    const targetCategoryId = target.dataset.categoryId;
                    const targetCategoryRow = container.querySelector(`.${categoryRowClass}[data-category-id="${targetCategoryId}"]`);
                    const targetCategoryServers = Array.from(container.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})[data-category-id="${targetCategoryId}"]`));
                    const lastServer = targetCategoryServers.length > 0 ? targetCategoryServers[targetCategoryServers.length - 1] : null;

                    if (targetCategoryRow && lastServer) {
                        insertBefore = position === 'before' ? targetCategoryRow : lastServer.nextSibling;
                    } else {
                        insertBefore = position === 'before' ? target : target.nextSibling;
                    }
                } else {
                    insertBefore = position === 'before' ? target : target.nextSibling;
                }

                target.parentNode.insertBefore(dragged, insertBefore);
                delete dragged._lastDropTarget;
                delete dragged._lastDropPosition;
            }

            if (DEBUG_DRAG) console.log("PteroSort: handleDrop - category drop, DOM before moveServersBelowCategory:", Array.from(dragged.parentNode?.children || []).map(c => c.dataset.categoryId || c.href?.split('/').pop()).join(' > '));
            moveServersBelowCategory(dragged);
            if (DEBUG_DRAG) console.log("PteroSort: handleDrop - category drop, DOM after moveServersBelowCategory:", Array.from(dragged.parentNode?.children || []).map(c => c.dataset.categoryId || c.href?.split('/').pop()).join(' > '));
        }

        if (dragged) {
            dragged.classList.remove('dragging-active');
        }

        saveOrder();
        fixSpacing();
    }

    function handleDragEnd(e) {
        if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd - dragged:", dragged, "draggedType:", draggedType);

        const draggedCategoryId = dragged && dragged.classList.contains(categoryRowClass) ? dragged.dataset.categoryId : null;
        const wasExpanded = dragged && dragged.dataset.wasExpandedBeforeDrag === 'true';

        if (dragged && draggedType === 'category') {
            if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd - category drag end, calling moveServersBelowCategory");
            if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd - category DOM position before move:", Array.from(dragged.parentNode?.children || []).map(c => c.dataset.categoryId || c.href?.split('/').pop()).join(' > '));

            moveServersBelowCategory(dragged);

            if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd - category DOM position after move:", Array.from(dragged.parentNode?.children || []).map(c => c.dataset.categoryId || c.href?.split('/').pop()).join(' > '));

            dragged.classList.remove('dragging-active');

            if (wasExpanded) {
                if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd - category was expanded before drag, scheduling re-expand");
                setTimeout(() => {
                    const finalDraggedElement = document.querySelector(`.${categoryRowClass}[data-category-id="${draggedCategoryId}"]`);
                    if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd setTimeout - found element:", finalDraggedElement);
                    if (finalDraggedElement && finalDraggedElement.dataset.wasExpandedBeforeDrag === 'true') {
                        toggleCategoryCollapse(finalDraggedElement, finalDraggedElement.dataset.categoryId, finalDraggedElement.querySelector('.category-collapse-icon'));
                        delete finalDraggedElement.dataset.wasExpandedBeforeDrag;
                        fixSpacing();
                        saveOrder();
                    }
                }, 0);
            } else {
                fixSpacing();
                saveOrder();
            }
        } else if (dragged && draggedType === 'server') {
            dragged.classList.remove('dragging-active');
            const resolvedCategoryId = resolveCategoryFromPosition(dragged);
            if (resolvedCategoryId) {
                dragged.dataset.categoryId = resolvedCategoryId;
            } else {
                delete dragged.dataset.categoryId;
            }
            if (DEBUG_DRAG) console.log("PteroSort: handleDragEnd - server final categoryId:", resolvedCategoryId || '(none)');
        } else if (dragged) {
            dragged.classList.remove('dragging-active');
        }

        dragged = null;
        draggedType = null;
    }

    function enableDragAndDrop() {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        function resetDragListeners(el) {
            el.removeEventListener('dragstart', handleDragStart);
            el.removeEventListener('dragover', handleDragOver);
            el.removeEventListener('drop', handleDrop);
            el.removeEventListener('dragend', handleDragEnd);
        }

        function addDragListeners(el) {
            el.addEventListener('dragstart', handleDragStart);
            el.addEventListener('dragover', handleDragOver);
            el.addEventListener('drop', handleDrop);
            el.addEventListener('dragend', handleDragEnd);
        }

        document.querySelectorAll(`${serverSelector}:not(.${categoryRowClass})`).forEach(el => {
            el.draggable = !dragLockEnabled;
            resetDragListeners(el);
            if (!dragLockEnabled) {
                addDragListeners(el);
            }
        });
        document.querySelectorAll(`.${categoryRowClass}`).forEach(el => {
            el.draggable = !dragLockEnabled;
            resetDragListeners(el);
            if (!dragLockEnabled) {
                addDragListeners(el);
            }
        });
    }

    function fixSpacing() {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        for (const child of container.children) {
            child.style.marginTop = '8px';

            if (child.classList.contains(categoryRowClass)) {

                child.style.marginLeft = '0px';

                child.style.display = '';
                child.querySelector('.server-category-indicator')?.remove();

            } else if (child.matches(serverSelector)) {

                const categoryId = child.dataset.categoryId;
                let indicator = child.querySelector('.server-category-indicator');

                if (categoryId) {

                    const category = categories.find(cat => cat.id === categoryId);
                    child.style.marginLeft = '40px';

                    child.style.display = (category && category.collapsed) ? 'none' : '';

                    if (category) {
                        if (!indicator) {
                            indicator = document.createElement('div');
                            indicator.className = 'server-category-indicator';
                            child.prepend(indicator);
                        }
                        indicator.style.backgroundColor = category.color;
                        indicator.style.display = '';
                    } else {

                        if (indicator) indicator.remove();
                        child.style.marginLeft = '0px';
                        child.style.display = '';
                        delete child.dataset.categoryId;
                    }
                } else {

                    child.style.marginLeft = '0px';
                    child.style.display = '';

                    if (indicator) {
                        indicator.remove();
                    }
                }
            }
        }

        if (container.firstElementChild) {
            container.firstElementChild.style.marginTop = '0px';
        }
    }

    function createButtons() {
        const container = document.querySelector(buttonContainerSelector);
        const toggleSwitch = document.querySelector(toggleSelector);

        if (!container || !toggleSwitch) return;

        if (document.getElementById('categoryButton')) return;

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'pterosort-button-wrapper';
        buttonWrapper.style.display = 'flex';
        buttonWrapper.style.gap = '10px';
        buttonWrapper.style.float = 'right';

        function createIconButton(id, title, backgroundColor, svgPath, clickHandler) {
            const btn = document.createElement('button');
            btn.id = id;
            btn.title = title;
            btn.className = 'pterosort-icon-button';
            btn.style.backgroundColor = backgroundColor;
            btn.addEventListener('click', clickHandler);
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white">${svgPath}</svg>`;
            return btn;
        }

        const categoryButton = createIconButton(
            'categoryButton',
            'Create new category',
            'rgb(22, 163, 74)',
            '<path d="M12 20a1 1 0 0 1-1-1v-6H5a1 1 0 0 1 0-2h6V5a1 1 0 0 1 2 0v6h6a1 1 0 0 1 0 2h-6v6a1 1 0 0 1-1 1"/>',
            () => openCategoryOverlay()
        );

        const lockButton = createIconButton(
            'lockDragButton',
            dragLockEnabled ? 'Unlock categories' : 'Lock categories',
            dragLockEnabled ? 'rgb(239, 68, 68)' : 'rgb(107, 114, 128)',
            dragLockEnabled
              ? '<path d="M17 9V7A5 5 0 0 0 7 7v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3M9 7a3 3 0 0 1 6 0v2H9Zm9 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1Z"/>'
              : '<path d="M17 9H9V7a3 3 0 0 1 5.12-2.13 3.1 3.1 0 0 1 .78 1.38 1 1 0 1 0 1.94-.5 5.1 5.1 0 0 0-1.31-2.29A5 5 0 0 0 7 7v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3m1 10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1Z"/>',
            () => {
                dragLockEnabled = !dragLockEnabled;
                localStorage.setItem('dragLockEnabled', dragLockEnabled);
                lockButton.title = dragLockEnabled ? 'Unlock categories' : 'Lock categories';
                lockButton.style.backgroundColor = dragLockEnabled ? 'rgb(239, 68, 68)' : 'rgb(107, 114, 128)';
                lockButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="white">${
                    dragLockEnabled
                      ? '<path d="M17 9V7A5 5 0 0 0 7 7v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3M9 7a3 3 0 0 1 6 0v2H9Zm9 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1Z"/>'
                      : '<path d="M17 9H9V7a3 3 0 0 1 5.12-2.13 3.1 3.1 0 0 1 .78 1.38 1 1 0 1 0 1.94-.5 5.1 5.1 0 0 0-1.31-2.29A5 5 0 0 0 7 7v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3m1 10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1Z"/>'
                }</svg>`;
                enableDragAndDrop();
            }
        );

        const settingsButton = createIconButton(
            'settingsButton',
            'Open Settings',
            'rgb(107, 114, 128)',
            '<path d="m21.32 9.55-1.89-.63.89-1.78A1 1 0 0 0 20.13 6L18 3.87a1 1 0 0 0-1.15-.19l-1.78.89-.63-1.89A1 1 0 0 0 13.5 2h-3a1 1 0 0 0-.95.68l-.63 1.89-1.78-.89A1 1 0 0 0 6 3.87L3.87 6a1 1 0 0 0-.19 1.15l.89 1.78-1.89.63a1 1 0 0 0-.68.94v3a1 1 0 0 0 .68.95l1.89.63-.89 1.78A1 1 0 0 0 3.87 18L6 20.13a1 1 0 0 0 1.15.19l1.78-.89.63 1.89a1 1 0 0 0 .95.68h3a1 1 0 0 0 .95-.68l.63-1.89 1.78.89a1 1 0 0 0 1.13-.19L20.13 18a1 1 0 0 0 .19-1.15l-.89-1.78 1.89-.63a1 1 0 0 0 .68-.94v-3a1 1 0 0 0-.68-.95M20 12.78l-1.2.4A2 2 0 0 0 17.64 16l.57 1.14-1.1 1.1-1.11-.6a2 2 0 0 0-2.79 1.16l-.4 1.2h-1.59l-.4-1.2A2 2 0 0 0 8 17.64l-1.14.57-1.1-1.1.6-1.11a2 2 0 0 0-1.16-2.82l-1.2-.4v-1.56l1.2-.4A2 2 0 0 0 6.36 8l-.57-1.11 1.1-1.1L8 6.36a2 2 0 0 0 2.82-1.16l.4-1.2h1.56l.4 1.2A2 2 0 0 0 16 6.36l1.14-.57 1.1 1.1-.6 1.11a2 2 0 0 0 1.16 2.79l1.2.4ZM12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4m0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2"/>',
            () => openSettingsOverlay()
        );

        buttonWrapper.appendChild(categoryButton);
        buttonWrapper.appendChild(lockButton);
        buttonWrapper.appendChild(settingsButton);

        console.log("PteroSort: Creating buttons...");

        const newButtonContainer = document.getElementById('pterosort-button-container');

        if (newButtonContainer) {
            newButtonContainer.innerHTML = '';

            buttonWrapper.style.display = 'flex';
            buttonWrapper.style.justifyContent = 'flex-end';
            buttonWrapper.style.alignItems = 'center';
            buttonWrapper.style.width = '100%';
            buttonWrapper.style.gap = '10px';
            buttonWrapper.style.float = 'none';
            buttonWrapper.style.position = 'static';

            newButtonContainer.appendChild(buttonWrapper);
            console.log("PteroSort: Appended button wrapper to new container:", newButtonContainer);

        } else {
            console.error("PteroSort: Could not find the new button container (#pterosort-button-container). Buttons not added.");
        }

    }

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'ptero-sort-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '10000';

        let clickedOnOverlay = false;

        overlay.addEventListener('mousedown', (event) => {
            clickedOnOverlay = (event.target === overlay);
        });

        overlay.addEventListener('click', (event) => {
            if (clickedOnOverlay && event.target === overlay) {
                overlay.remove();
            }
            clickedOnOverlay = false;
        });
        return overlay;
    }

    function createOverlayBox() {
        const box = document.createElement('div');
        box.className = 'ptero-sort-overlay-box';
        box.style.padding = '25px';
        box.style.background = 'var(--secondary-background-color, #2a3542)';
        box.style.color = 'var(--secondary-foreground-color, #ffffff)';
        box.style.boxShadow = '0px 5px 15px rgba(0,0,0,0.3)';
        box.style.borderRadius = '8px';
        box.style.textAlign = 'center';
        box.style.minWidth = '350px';
        box.style.maxWidth = '90vw';

        box.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        return box;
    }

    function openCategoryOverlay(editCategory = null) {
        const overlay = createOverlay();
        const box = createOverlayBox();

        const categoryId = editCategory ? editCategory.id : generateCategoryId();
        const isEditMode = !!editCategory;

        box.innerHTML = `
            <h3 style="margin-bottom: 20px; font-size: 1.3em;">${isEditMode ? 'Edit Category' : 'Create New Category'}</h3>
            <div style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
                <div>
                    <label for="categoryName" style="display: block; margin-bottom: 5px;">Name:</label>
                    <input type="text" id="categoryName" value="${editCategory ? editCategory.name : ''}" class="overlay-input">
                    <p id="categoryNameError" style="display: none; margin-top: 5px; color: #ef4444; font-weight: bold; font-size: 0.85em;">Category name cannot be empty.</p>
                </div>
                <div>
                    <label for="categoryColor" style="display: block; margin-bottom: 5px;">Color:</label>
                    <input type="color" id="categoryColor" value="${editCategory ? editCategory.color : '#4CAF50'}" style="width: 100%; height: 35px; border: none; border-radius: 5px; cursor: pointer; background-color: transparent;">
                </div>
                <div>
                    <label for="categoryDescription" style="display: block; margin-bottom: 5px;">Description:</label>
                    <textarea id="categoryDescription" class="overlay-input" style="height: 100px; resize: vertical;">${editCategory ? editCategory.description : ''}</textarea>
                </div>
            </div>
            <div style="margin-top: 25px; display: flex; justify-content: space-between; gap: 10px;">
                ${isEditMode ? `<button id="deleteCategory" class="overlay-button danger-button">Delete</button>` : '<div></div>'}
                <div>
                    <button id="cancelCategory" class="overlay-button secondary-button" style="margin-right: 10px;">Cancel</button>
                    <button id="confirmCategory" class="overlay-button primary-button">${isEditMode ? 'Save' : 'Create'}</button>
                </div>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById('categoryName').focus();

        document.getElementById('categoryName').addEventListener('input', () => {
            document.getElementById('categoryNameError').style.display = 'none';
        });

        document.getElementById('confirmCategory').addEventListener('click', () => {
            const name = document.getElementById('categoryName').value.trim();
            const color = document.getElementById('categoryColor').value;
            const description = document.getElementById('categoryDescription').value.trim();

            if (!name) {
                document.getElementById('categoryNameError').style.display = 'block';
                return;
            }

            if (isEditMode) {

                editCategory.name = name;
                editCategory.color = color;
                editCategory.description = description;

                const categoryElement = document.querySelector(`.${categoryRowClass}[data-category-id="${editCategory.id}"]`);
                if (categoryElement) {
                    categoryElement.querySelector('.ServerRow___StyledP-sc-1ibsw91-4').textContent = name;
                    categoryElement.querySelector(`.${categoryColorStripeClass}`).style.backgroundColor = color;
                    categoryElement.querySelector('.category-description').textContent = description;
                }
            } else {

                const newCategory = { id: categoryId, name, color, description, collapsed: false };
                categories.push(newCategory);

                 const categoryElement = createCategoryElement(newCategory);
                 const container = document.querySelector(containerSelector);
                 if (container) {

                     const firstItem = container.querySelector(`${serverSelector}, .${categoryRowClass}`);

                     container.insertBefore(categoryElement, firstItem);
                 }
             }

            saveCategories();
            saveOrder();
            enableDragAndDrop();
            fixSpacing();
            overlay.remove();
        });

        document.getElementById('cancelCategory').addEventListener('click', () => {
            overlay.remove();
        });

        if (isEditMode) {
            document.getElementById('deleteCategory').addEventListener('click', () => {

                deleteCategory(editCategory.id, editCategory.name);
                overlay.remove();
            });
        }
    }

    function openSettingsOverlay() {
        const overlay = createOverlay();
        const box = createOverlayBox();

        box.innerHTML = `
            <h3 style="margin-bottom: 20px; font-size: 1.3em;">Settings & Data</h3>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <button id="importSettings" class="overlay-button secondary-button">Import Settings</button>
                <button id="exportSettings" class="overlay-button secondary-button">Export Settings</button>
                <button id="clearAllStorage" class="overlay-button danger-button">Clear All Saved Data</button>
            </div>
            <div style="margin-top: 25px; text-align: right;">
                <button id="closeSettings" class="overlay-button primary-button">Close</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById('importSettings').addEventListener('click', () => {
            overlay.remove();
            openImportOverlay();
        });

        document.getElementById('exportSettings').addEventListener('click', () => {
            exportSettings();

        });

        document.getElementById('clearAllStorage').addEventListener('click', () => {
            overlay.remove();
            openClearConfirmationOverlay();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            overlay.remove();
        });
    }

    function openImportOverlay() {
        const overlay = createOverlay();
        const box = createOverlayBox();

        box.innerHTML = `
            <h3 style="margin-bottom: 15px;">Import Settings</h3>
            <p style="margin-bottom: 15px; font-size: 0.9em;">Upload a settings file or paste the exported JSON data below.</p>
            <input type="file" id="importFileInput" accept=".json" style="margin-bottom: 15px; width: 100%; padding: 8px; background-color: #1e2730; color: #e1e7ec; border: 1px solid #4f5d6a; border-radius: 4px; box-sizing: border-box;">
            <p style="margin: 10px 0 5px 0; font-size: 0.85em; color: #a7b4c0;">— or paste JSON —</p>
            <textarea id="importTextArea" class="overlay-input" placeholder="{...}" style="width: 100%; height: 150px; resize: vertical; margin-bottom: 5px;"></textarea>
            <p id="importError" style="display: none; margin-bottom: 20px; color: #ef4444; font-weight: bold; font-size: 0.85em;"></p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="cancelImport" class="overlay-button secondary-button">Cancel</button>
                <button id="confirmImport" class="overlay-button primary-button">Import & Reload</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const importError = document.getElementById('importError');

        document.getElementById('importFileInput').addEventListener('change', (event) => {
            importError.style.display = 'none';
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('importTextArea').value = e.target.result;
            };
            reader.onerror = () => {
                importError.textContent = 'Failed to read the selected file.';
                importError.style.display = 'block';
            };
            reader.readAsText(file);
        });

        document.getElementById('importTextArea').addEventListener('input', () => {
            importError.style.display = 'none';
        });

        document.getElementById('confirmImport').addEventListener('click', () => {
            const settingsJson = document.getElementById('importTextArea').value.trim();
            if (!settingsJson) {
                importError.textContent = 'Import data cannot be empty.';
                importError.style.display = 'block';
                return;
            }
            try {
                const settings = JSON.parse(settingsJson);

                if (typeof settings !== 'object' || settings === null ||
                    (!settings.order_yours && !settings.order_others && !settings.categories_yours && !settings.categories_others)) {
                     throw new Error("Invalid settings format.");
                }
                importSettings(settings);
                overlay.remove();
                location.reload();
            } catch (e) {
                console.error("Import Error:", e);
                importError.textContent = 'Failed to import settings. Invalid JSON data or format.';
                importError.style.display = 'block';
            }
        });

        document.getElementById('cancelImport').addEventListener('click', () => {
            overlay.remove();
        });
    }

    function exportSettings() {
        const settings = {

            categories_yours: JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES_YOURS) || '[]'),
            categories_others: JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES_OTHERS) || '[]'),
            order_yours: JSON.parse(localStorage.getItem(STORAGE_KEY_YOURS) || '[]'),
            order_others: JSON.parse(localStorage.getItem(STORAGE_KEY_OTHERS) || '[]'),

            dragLockEnabled: localStorage.getItem('dragLockEnabled')
        };

        const settingsJson = JSON.stringify(settings, null, 2);
        const blob = new Blob([settingsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        downloadLink.href = url;
        downloadLink.download = `pterosort_settings_${timestamp}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }

    function importSettings(settings) {

        if (settings.categories_yours) localStorage.setItem(STORAGE_KEY_CATEGORIES_YOURS, JSON.stringify(settings.categories_yours));
        if (settings.categories_others) localStorage.setItem(STORAGE_KEY_CATEGORIES_OTHERS, JSON.stringify(settings.categories_others));
        if (settings.order_yours) localStorage.setItem(STORAGE_KEY_YOURS, JSON.stringify(settings.order_yours));
        if (settings.order_others) localStorage.setItem(STORAGE_KEY_OTHERS, JSON.stringify(settings.order_others));

        if (settings.dragLockEnabled !== undefined && settings.dragLockEnabled !== null) localStorage.setItem('dragLockEnabled', settings.dragLockEnabled);
    }

    function openClearConfirmationOverlay() {
        const overlay = createOverlay();
        const box = createOverlayBox();
        box.innerHTML = `
            <h3 style="margin-bottom: 15px; color: #ef4444;">Confirm Deletion</h3>
            <p style="margin-bottom: 20px;">Are you sure you want to delete ALL saved server orders and categories? This cannot be undone.</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="cancelDeleteAll" class="overlay-button secondary-button">Cancel</button>
                <button id="confirmDeleteAll" class="overlay-button danger-button">Yes, Delete All</button>
            </div>
        `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById('confirmDeleteAll').addEventListener('click', () => {
            localStorage.removeItem(STORAGE_KEY_YOURS);
            localStorage.removeItem(STORAGE_KEY_OTHERS);
            localStorage.removeItem(STORAGE_KEY_CATEGORIES_YOURS);
            localStorage.removeItem(STORAGE_KEY_CATEGORIES_OTHERS);

            overlay.remove();
            location.reload();
        });

        document.getElementById('cancelDeleteAll').addEventListener('click', () => {
            overlay.remove();
        });
    }

    function createButtonContainerDiv() {

        if (document.getElementById('pterosort-button-container')) {
            console.log("PteroSort: Button container already exists.");
            return;
        }

        const originalHeader = document.querySelector(buttonContainerSelector);
        if (!originalHeader) {
            console.error("PteroSort: Could not find original header container:", buttonContainerSelector);
            return;
        }

        const newContainer = originalHeader.cloneNode(false);

        newContainer.id = 'pterosort-button-container';
        newContainer.style.cssText = '';
        newContainer.style.marginTop = '10px';
        newContainer.style.display = 'flex';
        newContainer.style.alignItems = 'center';
        newContainer.style.padding = '0 1.5rem';

        originalHeader.parentNode.insertBefore(newContainer, originalHeader.nextSibling);
        console.log("PteroSort: Created and inserted new button container div.");
    }

    function init() {
        console.log("PteroSort: Running init()...");
        createButtonContainerDiv();

        loadOrder();
        enableDragAndDrop();
        fixSpacing();

        setTimeout(createButtons, 50);
        console.log("PteroSort: init() finished.");
    }

    let _reinitDebounceTimer = null;
    let _isReinitInProgress = false;

    function requestReinit(source, force) {
        if (_isReinitInProgress && !force) {
            console.log(`PteroSort: Re-init already in progress, ignoring ${source}.`);
            return;
        }
        if (_reinitDebounceTimer) {
            console.log(`PteroSort: Debouncing re-init from ${source}.`);
            clearTimeout(_reinitDebounceTimer);
        }
        _reinitDebounceTimer = setTimeout(() => {
            _reinitDebounceTimer = null;
            console.log(`PteroSort: Re-initializing (trigger: ${source}).`);
            _isReinitInProgress = true;
            init();
            attachToggleListener();
            _isReinitInProgress = false;
        }, );
    }

    function attachToggleListener() {
        const toggleSwitch = document.querySelector(toggleSelector);
        if (!toggleSwitch) return;

        toggleSwitch.addEventListener('change', () => {
            console.log("PteroSort: Toggle switch changed.");

            if (_serverWaitObserver) {
                _serverWaitObserver.disconnect();
                _serverWaitObserver = null;
            }
            if (_serverWaitTimeout) {
                clearTimeout(_serverWaitTimeout);
                _serverWaitTimeout = null;
            }

            const spinnerSelector = '.kTCDrY';
            const spinnerExists = document.querySelector(spinnerSelector);

            if (spinnerExists) {
                console.log("PteroSort: Spinner detected, waiting for it to disappear...");
                _serverWaitObserver = new MutationObserver(() => {
                    const spinner = document.querySelector(spinnerSelector);
                    if (!spinner) {
                        console.log("PteroSort: Spinner disappeared, waiting for server rows...");
                        _serverWaitObserver.disconnect();
                        _serverWaitObserver = null;

                        _serverWaitTimeout = setTimeout(() => {
                            _serverWaitTimeout = null;
                            waitForServerRowsAndInit('toggle-spinner-gone');
                        }, 10);
                    }
                });
                _serverWaitObserver.observe(document.body, { childList: true, subtree: true });
            } else {
                waitForServerRowsAndInit('toggle-no-spinner');
            }
        });
    }

    function waitForServerRowsAndInit(source) {
        if (document.querySelectorAll(serverSelector).length > 0) {
            console.log(`PteroSort: Server rows already present (${source}), initiating immediately.`);
            requestReinit(source, true);
            return;
        }

        console.log(`PteroSort: Waiting for server rows to appear (${source})...`);
        _serverWaitObserver = new MutationObserver(() => {
            const serverRows = document.querySelectorAll(serverSelector);
            if (serverRows.length > 0) {
                _serverWaitObserver.disconnect();
                _serverWaitObserver = null;
                console.log(`PteroSort: Server rows appeared (${source}), small delay before init...`);
                _serverWaitTimeout = setTimeout(() => {
                    _serverWaitTimeout = null;
                    requestReinit(source, true);
                }, 10);
            }
        });
        _serverWaitObserver.observe(document.body, { childList: true, subtree: true });

        _serverWaitTimeout = setTimeout(() => {
            _serverWaitTimeout = null;
            if (_serverWaitObserver) {
                _serverWaitObserver.disconnect();
                _serverWaitObserver = null;
            }
            console.log(`PteroSort: Server row wait timeout (${source}), initiating anyway.`);
            requestReinit(source + '-timeout', true);
        }, 2000);
    }

    function observePageChanges() {
        const originalPushState = history.pushState.bind(history);
        history.pushState = function(state, title, url) {
            originalPushState(state, title, url);
            if (isDashboardPage()) {
                if (_serverWaitObserver) { _serverWaitObserver.disconnect(); _serverWaitObserver = null; }
                if (_serverWaitTimeout) { clearTimeout(_serverWaitTimeout); _serverWaitTimeout = null; }
                waitForServerRowsAndInit('pushState');
            } else {
                console.log("PteroSort: pushState detected but not on dashboard, skipping re-init.");
            }
        };

        const originalReplaceState = history.replaceState.bind(history);
        history.replaceState = function(state, title, url) {
            originalReplaceState(state, title, url);
            if (isDashboardPage()) {
                if (_serverWaitObserver) { _serverWaitObserver.disconnect(); _serverWaitObserver = null; }
                if (_serverWaitTimeout) { clearTimeout(_serverWaitTimeout); _serverWaitTimeout = null; }
                waitForServerRowsAndInit('replaceState');
            } else {
                console.log("PteroSort: replaceState detected but not on dashboard, skipping re-init.");
            }
        };

        window.addEventListener('popstate', () => {
            if (isDashboardPage()) {
                if (_serverWaitObserver) { _serverWaitObserver.disconnect(); _serverWaitObserver = null; }
                if (_serverWaitTimeout) { clearTimeout(_serverWaitTimeout); _serverWaitTimeout = null; }
                waitForServerRowsAndInit('popstate');
            } else {
                console.log("PteroSort: popstate detected but not on dashboard, skipping re-init.");
            }
        });

        attachToggleListener();

        console.log("PteroSort: Page change observers attached (pushState/replaceState/popstate/toggle).");
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

    if (isDashboardPage()) {
        waitForElement(serverSelector, () => {
            console.log("PteroSort: Initializing...");
            init();
            observePageChanges();
        });
    } else {
        console.log("PteroSort: Not on dashboard page (current path: " + window.location.pathname + "), skipping init but keeping observers active.");
        observePageChanges();
    }

    const style = document.createElement('style');
    style.textContent = `

        .${categoryRowClass} {
            background-color: rgba(0, 0, 0, 0.15);
            border-left: none;
            cursor: grab;
            position: relative;
            padding-left: 0 !important;
            display: flex !important;
            flex-wrap: wrap;
            align-items: center;
            min-height: 57px;
        }
        .${categoryRowClass}:hover {
            background-color: rgba(0, 0, 0, 0.25);
        }
        .${categoryColorStripeClass} {
            width: 0.6rem;
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            border-radius: 5px 0 0 5px;

        }

        .${categoryRowClass} > div:not(.${categoryColorStripeClass}):not(.category-controls) {
             margin-left: calc(0.6rem + 15px);
        }

        .${categoryRowClass} .ServerRow___StyledDiv4-sc-1ibsw91-10 {
            margin-left: auto !important;
            padding-right: 15px;
        }
        .${categoryRowClass} .category-description {
             color: #a7b4c0;
             font-size: 0.9em;
        }

        .server-category-indicator {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #ccc;
            box-shadow: 0 0 3px rgba(0,0,0,0.5);
            z-index: 1;
        }

        .dragging-active {
            opacity: 0.6;
            border: 2px dashed #888;
        }

        .ptero-sort-overlay-box {
            background-color: #2a3542;
            color: #e1e7ec;
            border: 1px solid #4f5d6a;
        }
        .overlay-input, .ptero-sort-overlay-box textarea {
            padding: 10px;
            border: 1px solid #4f5d6a;
            background-color: #1e2730;
            color: #e1e7ec;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
        }
         .overlay-input:focus, .ptero-sort-overlay-box textarea:focus {
             outline: none;
             border-color: #687f96;
             box-shadow: 0 0 0 2px rgba(104, 127, 150, 0.3);
         }

        .overlay-button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .primary-button {
            background-color: #3498db;
            color: white;
        }
        .primary-button:hover {
            background-color: #2980b9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .secondary-button {
            background-color: #5f7387;
            color: white;
        }
         .secondary-button:hover {
             background-color: #4e6072;
             box-shadow: 0 2px 4px rgba(0,0,0,0.2);
         }
        .danger-button {
            background-color: #e74c3c;
            color: white;
        }
         .danger-button:hover {
             background-color: #c0392b;
             box-shadow: 0 2px 4px rgba(0,0,0,0.2);
         }

         .pterosort-icon-button {
             padding: 6px;
             cursor: pointer;
             border: none;
             border-radius: 4px;
             display: flex;
             align-items: center;
             justify-content: center;
             transition: opacity 0.2s ease;
         }
         .pterosort-icon-button:hover {
             opacity: 0.8;
         }

         .category-edit-wrapper > .ServerRow___StyledDiv11-sc-1ibsw91-21,
         .category-delete-wrapper > .ServerRow___StyledDiv11-sc-1ibsw91-21 {
             transition: opacity 0.2s ease;
         }
         .category-edit-wrapper:hover > .ServerRow___StyledDiv11-sc-1ibsw91-21,
         .category-delete-wrapper:hover > .ServerRow___StyledDiv11-sc-1ibsw91-21 {
             opacity: 0.8;
         }

    `;
    document.head.appendChild(style);

})();
