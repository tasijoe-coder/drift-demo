Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$assetRoot = Join-Path $PSScriptRoot '..\public'
$glyph = [System.Drawing.Drawing2D.GraphicsPath]::new()
$family = [System.Drawing.FontFamily]::new('PMingLiU')
$brand = [string][char]0x6708 + [char]0x8001
$glyph.AddString($brand, $family, 0, 158, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
$bounds = $glyph.GetBounds()
$matrix = [System.Drawing.Drawing2D.Matrix]::new()
$matrix.Translate(256 - $bounds.X - $bounds.Width / 2, 253 - $bounds.Y - $bounds.Height / 2)
$glyph.Transform($matrix)
$points = $glyph.PathPoints
$types = $glyph.PathTypes
$segments = [System.Collections.Generic.List[string]]::new()
function Num([float]$value) { $value.ToString('0.###', [System.Globalization.CultureInfo]::InvariantCulture) }
for ($i = 0; $i -lt $points.Length; $i++) {
  $kind = $types[$i] -band 7
  $p = $points[$i]
  if ($kind -eq 0) { $segments.Add("M$(Num $p.X) $(Num $p.Y)") }
  elseif ($kind -eq 1) { $segments.Add("L$(Num $p.X) $(Num $p.Y)") }
  elseif ($kind -eq 3) {
    $p2 = $points[$i+1]; $p3 = $points[$i+2]
    $segments.Add("C$(Num $p.X) $(Num $p.Y) $(Num $p2.X) $(Num $p2.Y) $(Num $p3.X) $(Num $p3.Y)")
    $i += 2
  }
  if (($types[$i] -band 128) -ne 0) { $segments.Add('Z') }
}
$pathData = $segments -join ' '
$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="$brand">
  <rect width="512" height="512" fill="#231a16"/>
  <rect x="48" y="48" width="416" height="416" fill="none" stroke="#b84a39" stroke-width="12"/>
  <rect x="67" y="67" width="378" height="378" fill="none" stroke="#d4a359" stroke-opacity=".42" stroke-width="2"/>
  <path d="$pathData" fill="#ead6b2"/>
  <path d="M154 364 C210 331 296 398 358 354" fill="none" stroke="#b84a39" stroke-width="7" stroke-linecap="round"/>
  <circle cx="256" cy="118" r="6" fill="#d4a359"/>
</svg>
"@
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText((Join-Path $assetRoot 'favicon-yuelao-v1.svg'), $svg, $utf8)
[System.IO.File]::WriteAllText((Join-Path $assetRoot 'favicon.svg'), $svg, $utf8)
$bitmap = [System.Drawing.Bitmap]::new(1024,1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.ScaleTransform(2,2)
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#231a16'))
$red = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#b84a39'),12)
$graphics.DrawRectangle($red,48,48,416,416)
$gold = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(107,212,163,89),2)
$graphics.DrawRectangle($gold,67,67,378,378)
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#ead6b2'))
$graphics.FillPath($ink,$glyph)
$thread = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#b84a39'),7)
$thread.StartCap = $thread.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawBezier($thread,154,364,210,331,296,398,358,354)
$dot = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#d4a359'))
$graphics.FillEllipse($dot,250,112,12,12)
foreach ($size in @(180,192,512)) {
  $resized = [System.Drawing.Bitmap]::new($size,$size)
  $g = [System.Drawing.Graphics]::FromImage($resized)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($bitmap,0,0,$size,$size)
  $filename = if ($size -eq 180) { 'apple-touch-icon-yuelao-v1.png' } else { "icon-yuelao-v1-$size.png" }
  $legacy = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
  $resized.Save((Join-Path $assetRoot $filename),[System.Drawing.Imaging.ImageFormat]::Png)
  $resized.Save((Join-Path $assetRoot $legacy),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $resized.Dispose()
}
$graphics.Dispose(); $bitmap.Dispose(); $glyph.Dispose(); $family.Dispose(); $matrix.Dispose()
$red.Dispose(); $gold.Dispose(); $ink.Dispose(); $thread.Dispose(); $dot.Dispose()
Write-Output 'Generated Yue Lao SVG and 180/192/512 PNG icons.'

