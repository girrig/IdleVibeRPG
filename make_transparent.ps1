Add-Type -AssemblyName System.Drawing

function Remove-BlackBackground {
    param (
        [string]$InputPath,
        [string]$OutputPath
    )

    Write-Host "Processing $InputPath..."

    try {
        $img = [System.Drawing.Bitmap]::FromFile($InputPath)
        $img.MakeTransparent([System.Drawing.Color]::Black)
        $img.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        Write-Host "Saved to $OutputPath"
    }
    catch {
        Write-Error "Failed to process $InputPath : $_"
    }
}

# Paths to original solid artifacts
$Assets = @(
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\hero_sprite_1768440433341.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\character.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\tree_sprite_1768440509582.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\tree.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\pond_sprite_1768440523526.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\pond.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\tent_sprite_1768440535858.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\tent.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\campfire_sprite_1768440549550.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\campfire.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\copper_ore_sprite_1768440565769.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\copper_ore.png"),
    @("C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\raw_fish_sprite_1768440578697.png", "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\raw_fish.png")
)

# Handle Grass Separately (Direct Copy, no transparency needed for tile)
Copy-Item -Path "C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\grass_tile_1768440419350.png" -Destination "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\grass.png" -Force
Write-Host "Copied grass.png (no transparency)"

foreach ($asset in $Assets) {
    Remove-BlackBackground -InputPath $asset[0] -OutputPath $asset[1]
}
