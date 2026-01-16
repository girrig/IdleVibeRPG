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
                
                # HEURISTIC LOGIC (Magenta/Pink/Purple detection)
                $diffRB = [Math]::Abs($pixel.R - $pixel.B)
                
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

# Process ONLY the new base character
Force-Transparency -InputPath "C:\Users\girri\.gemini\antigravity\brain\54057db9-a8cf-40e5-aa8e-c071b150759a\character_base_magenta_1768441873252.png" -OutputPath "c:\Users\girri\OneDrive\code\workspace\IdleVibeRPG\src\assets\character.png"
