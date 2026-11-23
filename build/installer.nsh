!macro customHeader
  !ifdef UNINSTALL_FILENAME
    !undef UNINSTALL_FILENAME
  !endif
  !define UNINSTALL_FILENAME "Uninstall.exe"
  !ifndef BUILD_UNINSTALLER
    ; Enables NSIS native Browse auto-append so picking e.g. G:\ruanjian immediately displays G:\ruanjian\Gas
    InstallDir "$LOCALAPPDATA\Programs\Gas"
  !endif
!macroend

!macro customInstall
  CreateDirectory "$INSTDIR\saved-models"
!macroend
