param(
    [string]$AssetDirectory = "$PSScriptRoot\..\public\assets\furniture",
    [int]$AlphaCutoff = 160,
    [int]$MaximumEdge = 512
)

Add-Type -AssemblyName System.Drawing

Get-ChildItem -LiteralPath $AssetDirectory -Filter "*-v2.png" | ForEach-Object {
    $source = [System.Drawing.Bitmap]::FromFile($_.FullName)
    $left = $source.Width
    $top = $source.Height
    $right = 0
    $bottom = 0

    for ($y = 0; $y -lt $source.Height; $y++) {
        for ($x = 0; $x -lt $source.Width; $x++) {
            if ($source.GetPixel($x, $y).A -ge $AlphaCutoff) {
                if ($x -lt $left) { $left = $x }
                if ($x -gt $right) { $right = $x }
                if ($y -lt $top) { $top = $y }
                if ($y -gt $bottom) { $bottom = $y }
            }
        }
    }

    $padding = 12
    $left = [Math]::Max(0, $left - $padding)
    $top = [Math]::Max(0, $top - $padding)
    $right = [Math]::Min($source.Width - 1, $right + $padding)
    $bottom = [Math]::Min($source.Height - 1, $bottom + $padding)
    $width = $right - $left + 1
    $height = $bottom - $top + 1
    $clean = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
            $pixel = $source.GetPixel($left + $x, $top + $y)
            if ($pixel.A -lt $AlphaCutoff) {
                $clean.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            } else {
                $clean.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
            }
        }
    }

    $scale = [Math]::Min(1.0, $MaximumEdge / [double][Math]::Max($width, $height))
    $outputWidth = [Math]::Max(1, [int][Math]::Round($width * $scale))
    $outputHeight = [Math]::Max(1, [int][Math]::Round($height * $scale))
    $output = New-Object System.Drawing.Bitmap $outputWidth, $outputHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($output)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $graphics.DrawImage($clean, 0, 0, $outputWidth, $outputHeight)

    $outputName = $_.BaseName.Replace("-v2", "-game") + ".png"
    $output.Save((Join-Path $AssetDirectory $outputName), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $output.Dispose()
    $clean.Dispose()
    $source.Dispose()
}
