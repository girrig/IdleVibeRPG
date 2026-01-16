Add-Type -AssemblyName System.Drawing

function Force-Transparency {
    param (
        [string]$InputPath,
        [string]$OutputPath
    )

    Write-Host "Pixel-Scanning (Heuristic) $InputPath..."

    try {
        if (-not (Test-Path $InputPath)) {
            Write-Warning "File not found: $InputPath"
            return
        }

        # Open file
        $fileBmp = [System.Drawing.Bitmap]::FromFile($InputPath)
        # Create a new blank bitmap
        $img = New-Object System.Drawing.Bitmap($fileBmp.Width, $fileBmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($img)
        $g.DrawImage($fileBmp, 0, 0, $fileBmp.Width, $fileBmp.Height)
        $g.Dispose()
        $fileBmp.Dispose()

        # Iterate pixels
        for ($x = 0; $x -lt $img.Width; $x++) {
            for ($y = 0; $y -lt $img.Height; $y++) {
                $pixel = $img.GetPixel($x, $y)
                
                # HEURISTIC LOGIC
                # Target: Magenta/Purple/Pink spectrum
                # Condition: Green channel is significantly weaker than both Red and Blue
                # AND Red and Blue are somewhat close to each other (to avoid pure Red or pure Blue)
                
                $diffRB = [Math]::Abs($pixel.R - $pixel.B)
                
                # If RGB is (255, 0, 255) -> G(0)+40 < 255? Yes. DiffRB(0) < 80? Yes. -> Remove
                # If (200, 100, 200) -> G(100)+40 < 200? Yes. DiffRB(0) < 80? Yes -> Remove
                # If (100, 100, 200) [Blueish] -> G(100)+40 < 100(R)? No. -> Keep
                
                if (($pixel.G + 40 -lt $pixel.R) -and 
                    ($pixel.G + 40 -lt $pixel.B) -and 
                    ($diffRB -lt 80)) {
                    
                    $img.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
                }
            }
        }
        
        $img.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        Write-Host "Saved transparent version to $OutputPath"
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
    Force-Transparency -InputPath $asset[0] -OutputPath $asset[1]
}
