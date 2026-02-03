<#
.SYNOPSIS
    Sets up OpenSSH Server and Ngrok for remote code editing.
    MUST BE RUN AS ADMINISTRATOR.

.DESCRIPTION
    1. Installs OpenSSH Server (Windows Feature).
    2. Starts the SSH Server service.
    3. Installs Ngrok via Winget.
    4. Helps you configure Ngrok.
#>

$ErrorActionPreference = "Stop"

function Test-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    Write-Host "⚠️  ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click on PowerShell and select 'Run as Administrator', then run this script again."
    exit 1
}

Write-Host "`n🚀 Starting Setup for SSH + Ngrok...`n" -ForegroundColor Cyan

# 1. Install OpenSSH Server
Write-Host "1️⃣  Checking OpenSSH Server..." -ForegroundColor Yellow
$sshService = Get-Service -Name sshd -ErrorAction SilentlyContinue

if (-not $sshService) {
    Write-Host "   Installing OpenSSH Server (this may take a minute)..." -ForegroundColor Gray
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
}
else {
    Write-Host "   OpenSSH Server is already installed." -ForegroundColor Green
}

# 2. Start SSH Service
Write-Host "`n2️⃣  Starting SSH Service..." -ForegroundColor Yellow
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
if ((Get-Service sshd).Status -eq 'Running') {
    Write-Host "   SSH Service is RUNNING." -ForegroundColor Green
}
else {
    Write-Host "   Failed to start SSH Service." -ForegroundColor Red
}

# 3. Install Ngrok
Write-Host "`n3️⃣  Checking Ngrok..." -ForegroundColor Yellow
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing Ngrok via Winget..." -ForegroundColor Gray
    winget install Ngrok.Ngrok --silent --accept-package-agreements --accept-source-agreements
    
    # Reload env vars to find ngrok
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
        Write-Host "   ⚠️  Ngrok installed but not found in PATH yet. You may need to restart your terminal." -ForegroundColor Red
        Write-Host "   Navigate to its installation folder to run it."
    }
    else {
        Write-Host "   Ngrok installed successfully." -ForegroundColor Green
    }
}
else {
    Write-Host "   Ngrok is already installed." -ForegroundColor Green
}

# 4. Configure Ngrok Authtoken
Write-Host "`n4️⃣  Configuring Ngrok Token..." -ForegroundColor Yellow
if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    ngrok config add-authtoken 2lDFk7PjiDp2OUy4Pv2t2eTFmNF_5JRUowy75FbQw64otaqMj
    Write-Host "   Ngrok authtoken configured." -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  Ngrok command not found. You may need to restart the terminal and run 'ngrok config add-authtoken <TOKEN>' manually." -ForegroundColor Red
}

# 5. Instructions
Write-Host "`n✅ Setup Complete (Dependencies installed)." -ForegroundColor Cyan
Write-Host "`n------------------------------------------------------------"
Write-Host "NEXT STEPS TO SHARE YOUR PROJECT:" -ForegroundColor White
Write-Host "1.  Run the following command to start the tunnel:"
Write-Host "      ngrok tcp 22"
Write-Host "2.  Give your friend the URL (e.g., tcp://0.tcp.ngrok.io:12345)"
Write-Host "    They will connect using:"
Write-Host "      ssh $env:USERNAME@0.tcp.ngrok.io -p 12345"
Write-Host "------------------------------------------------------------`n"
