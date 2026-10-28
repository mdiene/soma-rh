# Installe (ou met à jour) les outils et skills de développement du projet SOMA-RH sous Windows.
# Exécuter depuis C:\IT-Mozaic\SOMA-RH :  powershell -ExecutionPolicy Bypass -File scripts\setup-skills.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host 'Skills Supabase…'
npx -y skills add supabase/agent-skills -a claude-code -s '*' -y --copy

Write-Host 'Skills React et design…'
npx -y skills add vercel-labs/agent-skills -a claude-code -s vercel-react-best-practices -s vercel-composition-patterns -s web-design-guidelines -s deploy-to-vercel -s vercel-cli-with-tokens -y --copy
npx -y skills add anthropics/skills -a claude-code -s frontend-design -s webapp-testing -s xlsx -y --copy
npx -y skills add nextlevelbuilder/ui-ux-pro-max-skill -a claude-code -s ui-ux-pro-max -s ui-styling -s design-system -y --copy

Write-Host 'Graphify (outil en ligne de commande + skill)…'
python -m pip install --upgrade graphifyy
$env:CLAUDE_CONFIG_DIR = (Join-Path (Get-Location) '.claude')
graphify install --platform windows
Remove-Item Env:\CLAUDE_CONFIG_DIR

Write-Host 'Terminé. Dans Claude Code : /mcp pour authentifier Supabase, puis /graphify . pour cartographier le code.'
