Add-Type -AssemblyName System.Drawing

function Remove-MagentaBackground {
    param (
        [string]$InputPath,
        [string]$OutputPath
    )

    Write-Host "Processing $InputPath..."

    try {
        if (-not (Test-Path $InputPath)) {
            Write-Warning "File not found: $InputPath"
            return
        }

        $img = [System.Drawing.Bitmap]::FromFile($InputPath)
        # Magenta Color Key #FF00FF
        $magenta = [System.Drawing.Color]::FromArgb(255, 0, 255)
        $img.MakeTransparent($magenta)
        
        $img.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        Write-Host "Saved to $OutputPath"
    }
    catch {
        Write-Error "Failed to process $InputPath : $_"
    }
}

# Paths to generated magenta artifacts with specific timestamps
$Assets = @(
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\hero_magenta_1768441083970.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\character.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\tree_magenta_1768441102166.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\tree.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\pond_magenta_1768441114416.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\pond.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\tent_magenta_1768441126247.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\tent.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\campfire_magenta_1768441139006.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\campfire.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\copper_ore_magenta_1768441151894.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\copper_ore.png")
)

foreach ($asset in $Assets) {
    Remove-MagentaBackground -InputPath $asset[0] -OutputPath $asset[1]
}
