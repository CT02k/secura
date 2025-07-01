document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".codes-container")
  const addBtn = document.querySelector(".add-new")
  const searchInput = document.getElementById("search-input")
  const hideShowBtn = document.querySelector(".hide-show i")
  const tabContainer = document.querySelector(".tabs")
  const versionElement = document.getElementById("app-version")
  const updateCheckBtn = document.getElementById("update-check-btn")

  let tokens = []
  let hideCodes = true
  let activeTab = "all"
  
  // Load and display app version
  window.electronAPI.getAppVersion().then(version => {
    versionElement.textContent = `v${version}`
  })
  
  // Update check functionality
  updateCheckBtn.addEventListener("click", async () => {
    const icon = updateCheckBtn.querySelector("i")
    icon.classList.add("fa-spin")
    updateCheckBtn.disabled = true
    
    try {
      await window.electronAPI.checkForUpdates()
    } catch (error) {
      console.error("Update check failed:", error)
    } finally {
      setTimeout(() => {
        icon.classList.remove("fa-spin")
        updateCheckBtn.disabled = false
      }, 2000)
    }
  })

  function switchTab(tabName) {
    activeTab = tabName
    
    document.querySelectorAll(".tab").forEach(tab => {
      const isActive = tab.dataset.tab === tabName
      tab.classList.toggle("active", isActive)
      tab.setAttribute("aria-selected", isActive)
    })
    
    filterRenderedTokens(searchInput.value)
  }

  tabContainer.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab")
    if (tab && tab.dataset.tab) {
      switchTab(tab.dataset.tab)
    }
  })

  tabContainer.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault()
      const tabs = Array.from(document.querySelectorAll(".tab"))
      const currentIndex = tabs.findIndex(tab => tab.classList.contains("active"))
      const nextIndex = e.key === "ArrowRight" 
        ? (currentIndex + 1) % tabs.length
        : (currentIndex - 1 + tabs.length) % tabs.length
      
      tabs[nextIndex].focus()
      switchTab(tabs[nextIndex].dataset.tab)
    }
  })

  async function renderTokens(filter = "") {
    container.innerHTML = ""
    
    if (tokens.length === 0) {
      updateEmptyState(true, filter)
      return
    }

    for (const [i, token] of tokens.entries()) {
      const code = await window.electronAPI.generateCode(token.secret)
      const el = document.createElement("div")
      el.className = "code-item"
      el.innerHTML = `
        <div class="service-info">
          <div class="service-icon" style="background-color: ${token.color}; color: white;">
            <i class="${token.icon}"></i>
          </div>
          <div>
            <div class="service-name">
            <i class="fas fa-star favorite-star" 
               style="color: ${token.favorite ? "#FFD700" : "#ccc"}; cursor: pointer; margin-right: 4px;" 
               data-token-index="${i}"
               title="${token.favorite ? "Remove from favorites" : "Add to favorites"}"></i>
            ${token.name}
            </div>
            ${token.account ? `<div class="service-account">${token.account}</div>` : ""}
          </div>
        </div>
        <div class="code-display">
          <div class="code" data-index="${i}">
            <i class="fas fa-copy"></i>
            <span>${hideCodes ? "••••••" : code.replace(/(\d{3})(\d{3})/, "$1 $2")}</span>
          </div>
          <div class="timer-container">
            <div class="timer-circle" data-index="${i}">
              <svg class="timer-svg" width="40" height="40">
                <circle class="timer-track" cx="20" cy="20" r="16" fill="none" stroke="#106BFF" stroke-width="2"/>
                <circle class="timer-progress" cx="20" cy="20" r="16" fill="none" stroke="#e0e0e0" stroke-width="2" 
                        stroke-linecap="round" stroke-dasharray="100.53" stroke-dashoffset="0"/>
              </svg>
              <div class="timer-text">0s</div>
            </div>
          </div>
        </div>
        <div class="token-actions-overlay">
          <button class="action-btn edit-btn" data-index="${i}" title="Edit token">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete-btn" data-index="${i}" title="Delete token">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `
      container.appendChild(el)
    }

    attachCopyListeners()
    attachFavoriteListeners()
    attachActionListeners()
    
    filterRenderedTokens(filter)
  }

  function toggleCodeVisibility() {
    hideCodes = !hideCodes
    document.querySelectorAll(".code span").forEach(span => {
      const codeEl = span.closest(".code")
      const tokenIndex = parseInt(codeEl.getAttribute("data-index"))
      if (tokens[tokenIndex]) {
        window.electronAPI.generateCode(tokens[tokenIndex].secret).then(code => {
          span.textContent = hideCodes ? "••••••" : code.replace(/(\d{3})(\d{3})/, "$1 $2")
        })
      }
    })
  }

  function filterRenderedTokens(filter = "") {
    const allItems = container.querySelectorAll(".code-item")
    let visibleCount = 0
    
    allItems.forEach(item => {
      const tokenIndex = parseInt(item.querySelector(".code").getAttribute("data-index"))
      const token = tokens[tokenIndex]
      
      if (!token) {
        item.style.display = "none"
        return
      }
      
      const matchesSearch = !filter || 
        token.name.toLowerCase().includes(filter.toLowerCase()) ||
        (token.account || "").toLowerCase().includes(filter.toLowerCase())
      
      const matchesTab = activeTab === "all" || 
        (activeTab === "favorites" && token.favorite === true)
      
      const shouldShow = matchesSearch && matchesTab
      item.style.display = shouldShow ? "flex" : "none"
      
      if (shouldShow) visibleCount++
    })
    
    updateEmptyState(visibleCount === 0, filter)
  }
  
  function updateEmptyState(show, filter = "") {
    let emptyState = container.querySelector(".empty-state")
    
    if (show) {
      if (!emptyState) {
        emptyState = document.createElement("div")
        emptyState.className = "empty-state"
        container.appendChild(emptyState)
      }
      
      emptyState.innerHTML = `
        <div class="empty-icon">
          <i class="fas fa-${activeTab === "favorites" ? "star" : "search"}"></i>
        </div>
        <div class="empty-text">
          ${activeTab === "favorites" 
            ? "No favorite tokens yet" 
            : filter 
              ? "No tokens match your search" 
              : "No tokens added yet"}
        </div>
        ${activeTab !== "favorites" && !filter ? "<div class=\"empty-subtext\">Click the + button to add your first token</div>" : ""}
      `
    } else if (emptyState) {
      emptyState.remove()
    }
  }

  function attachCopyListeners() {
    container.querySelectorAll(".code").forEach(codeEl => {
      codeEl.addEventListener("click", async () => {
        const idx = parseInt(codeEl.getAttribute("data-index"))
        if (isNaN(idx) || !tokens[idx]) return
        
        const code = await window.electronAPI.generateCode(tokens[idx].secret)
        navigator.clipboard.writeText(code)
        codeEl.querySelector("i").classList.replace("fa-copy", "fa-check")
        setTimeout(() => {
          codeEl.querySelector("i").classList.replace("fa-check", "fa-copy")
        }, 1000)
      })
    })
  }

  function attachFavoriteListeners() {
    container.querySelectorAll(".favorite-star").forEach(star => {
      star.addEventListener("click", async (e) => {
        e.stopPropagation()
        const idx = parseInt(star.getAttribute("data-token-index"))
        if (isNaN(idx) || !tokens[idx]) return
        
        tokens[idx].favorite = !tokens[idx].favorite
        
        window.electronAPI.saveTokens(tokens)
        
        star.style.color = tokens[idx].favorite ? "#FFD700" : "#ccc"
        star.title = tokens[idx].favorite ? "Remove from favorites" : "Add to favorites"
        
        if (activeTab === "favorites") {
          filterRenderedTokens(searchInput.value)
        }
      })
    })
  }

  function attachActionListeners() {
    container.querySelectorAll(".action-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation()
        const idx = parseInt(btn.getAttribute("data-index"))
        if (isNaN(idx) || !tokens[idx]) return
        
        if (btn.classList.contains("delete-btn")) {
          if (confirm(`Are you sure you want to delete "${tokens[idx].name}"?`)) {
            tokens.splice(idx, 1)
            window.electronAPI.saveTokens(tokens)
            await renderTokens(searchInput.value)
            startTimers()
          }
        } else if (btn.classList.contains("edit-btn")) {
          openEditModal(idx)
        }
      })
    })
  }

  let editingTokenIndex = -1

  function openEditModal(index) {
    editingTokenIndex = index
    const token = tokens[index]
    
    document.getElementById("edit-modal-name").value = token.name
    document.getElementById("edit-modal-account").value = token.account || ""
    document.getElementById("edit-modal-secret").value = token.secret
    document.getElementById("edit-token-modal").style.display = "flex"
  }

  function closeEditModal() {
    document.getElementById("edit-token-modal").style.display = "none"
    document.getElementById("edit-modal-name").value = ""
    document.getElementById("edit-modal-account").value = ""
    document.getElementById("edit-modal-secret").value = ""
    editingTokenIndex = -1
  }

  function startTimers() {
    clearInterval(window.timerInterval)
    window.timerInterval = setInterval(async () => {
      const timeLeft = 30 - Math.floor((Date.now() / 1000) % 30)
      const progress = ((30 - timeLeft) / 30) * 100.53
      
      document.querySelectorAll(".timer-circle").forEach(timerEl => {
        const textEl = timerEl.querySelector(".timer-text")
        const progressEl = timerEl.querySelector(".timer-progress")
        
        if (textEl) textEl.textContent = `${timeLeft}s`
        if (progressEl) progressEl.style.strokeDashoffset = 100.53 - progress
      })
      
      if (timeLeft === 30) {
        await refreshCodes()
      }
    }, 1000)
  }

  async function refreshCodes() {
    const codeElements = document.querySelectorAll(".code span")
    for (const span of codeElements) {
      const codeEl = span.closest(".code")
      const tokenIndex = parseInt(codeEl.getAttribute("data-index"))
      if (tokens[tokenIndex]) {
        const code = await window.electronAPI.generateCode(tokens[tokenIndex].secret)
        span.textContent = hideCodes ? "••••••" : code.replace(/(\d{3})(\d{3})/, "$1 $2")
      }
    }
  }

  addBtn.addEventListener("click", () => {
    document.getElementById("add-token-modal").style.display = "flex"
  })

  searchInput.addEventListener("input", () => {
    filterRenderedTokens(searchInput.value)
  })

  window.electronAPI.loadTokens().then(async data => {
    tokens = data.map(token => ({
      ...token,
      favorite: token.favorite !== undefined ? token.favorite : false
    }))
    
    await renderTokens()
    startTimers()
  })

  document.getElementById("confirm-add").addEventListener("click", async () => {
    const name = document.getElementById("modal-name").value.trim()
    const account = document.getElementById("modal-account").value.trim()
    const secret = document.getElementById("modal-secret").value.trim()
    const color = "#333"
    const icon = "fas fa-key"

    if (!name || !secret) {
      alert("Nome e segredo são obrigatórios.")
      return
    }

    const newToken = { name, account, secret, icon, color, favorite: false }
    tokens.push(newToken)
    window.electronAPI.saveTokens(tokens)
    await renderTokens(searchInput.value)
    startTimers()
    closeModal()
  })

  document.getElementById("cancel-add").addEventListener("click", closeModal)

  document.getElementById("confirm-edit").addEventListener("click", async () => {
    const name = document.getElementById("edit-modal-name").value.trim()
    const account = document.getElementById("edit-modal-account").value.trim()
    const secret = document.getElementById("edit-modal-secret").value.trim()

    if (!name || !secret) {
      alert("Nome e segredo são obrigatórios.")
      return
    }

    if (editingTokenIndex >= 0 && tokens[editingTokenIndex]) {
      tokens[editingTokenIndex] = {
        ...tokens[editingTokenIndex],
        name,
        account,
        secret
      }
      
      window.electronAPI.saveTokens(tokens)
      await renderTokens(searchInput.value)
      startTimers()
      closeEditModal()
    }
  })

  document.getElementById("cancel-edit").addEventListener("click", closeEditModal)

  document.querySelector(".hide-show").addEventListener("click", () => {
    hideShowBtn.classList.toggle("fa-eye")
    hideShowBtn.classList.toggle("fa-eye-slash")
    toggleCodeVisibility()
  })

  function closeModal() {
    document.getElementById("add-token-modal").style.display = "none"
    document.getElementById("modal-name").value = ""
    document.getElementById("modal-account").value = ""
    document.getElementById("modal-secret").value = ""
  }

  document.querySelector(".title-bar-control.minimize").addEventListener("click", () => {
    window.electronAPI.minimizeWindow()
  })

  document.querySelector(".title-bar-control.close").addEventListener("click", () => {
    window.electronAPI.closeWindow()
  })
})

