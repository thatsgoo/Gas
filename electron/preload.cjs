const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('sketchpadDesktop', {
  isDesktop: true,
  listSavedModels: () => ipcRenderer.invoke('saved-models:list'),
  saveModel: (model) => ipcRenderer.invoke('saved-models:save', model),
  renameModel: (id, name) => ipcRenderer.invoke('saved-models:rename', { id, name }),
  deleteModel: (id) => ipcRenderer.invoke('saved-models:delete', id),
  openSavedModelsFolder: () => ipcRenderer.invoke('saved-models:open-folder'),
})
