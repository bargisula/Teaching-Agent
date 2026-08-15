param(
  [Parameter(Mandatory=$true)][string]$SpecPath,
  [Parameter(Mandatory=$true)][string]$OutDir
)
Add-Type -AssemblyName System.Drawing

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$spec = Get-Content -Raw -Encoding UTF8 -Path $SpecPath | ConvertFrom-Json

function WrapText([System.Drawing.Graphics]$g, [string]$text, [System.Drawing.Font]$font, [int]$maxWidth) {
  $lines = New-Object System.Collections.Generic.List[string]
  $current = ''
  foreach ($ch in $text.ToCharArray()) {
    if ($ch -eq "`n") { $lines.Add($current); $current = ''; continue }
    $trial = $current + $ch
    $size = $g.MeasureString($trial, $font)
    if ($size.Width -gt $maxWidth -and $current.Length -gt 0) {
      $lines.Add($current)
      $current = [string]$ch
    } else {
      $current = $trial
    }
  }
  if ($current.Length -gt 0) { $lines.Add($current) }
  return $lines
}

$titleFont = New-Object System.Drawing.Font('Microsoft JhengHei', 48, [System.Drawing.FontStyle]::Bold)
$coverTitleFont = New-Object System.Drawing.Font('Microsoft JhengHei', 64, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font('Microsoft JhengHei', 28)
$tagFont = New-Object System.Drawing.Font('Microsoft JhengHei', 20, [System.Drawing.FontStyle]::Bold)

$darkBg = [System.Drawing.ColorTranslator]::FromHtml('#0A1930')
$lightBg = [System.Drawing.ColorTranslator]::FromHtml('#F4F1EA')
$accent = [System.Drawing.ColorTranslator]::FromHtml('#E4572E')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#23261F')
$gold = [System.Drawing.ColorTranslator]::FromHtml('#D9A441')
$white = [System.Drawing.Color]::White

foreach ($page in $spec.pages) {
  $bmp = New-Object System.Drawing.Bitmap 1600, 900
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'

  $isCover = ($page.type -eq 'cover')

  if ($isCover) {
    $g.Clear($darkBg)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $accent), 0, 820, 1600, 12)
    $titleLines = WrapText $g $page.title $coverTitleFont 1300
    $y = 340
    foreach ($line in $titleLines) {
      $g.DrawString($line, $coverTitleFont, (New-Object System.Drawing.SolidBrush $white), 150, $y)
      $y += 90
    }
    if ($page.message) {
      $msgLines = WrapText $g $page.message $bodyFont 1300
      foreach ($line in $msgLines) {
        $g.DrawString($line, $bodyFont, (New-Object System.Drawing.SolidBrush $gold), 150, $y)
        $y += 42
      }
    }
  } else {
    $g.Clear($lightBg)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $accent), 0, 0, 1600, 14)
    $g.DrawString(('Slide ' + ([int]$page.page)), $tagFont, (New-Object System.Drawing.SolidBrush $accent), 100, 60)
    $titleLines = WrapText $g $page.title $titleFont 1400
    $y = 120
    foreach ($line in $titleLines) {
      $g.DrawString($line, $titleFont, (New-Object System.Drawing.SolidBrush $ink), 100, $y)
      $y += 68
    }
    $y += 30
    if ($page.message) {
      $msgLines = WrapText $g $page.message $bodyFont 1400
      foreach ($line in $msgLines) {
        $g.DrawString($line, $bodyFont, (New-Object System.Drawing.SolidBrush $ink), 100, $y)
        $y += 44
      }
    }
  }

  $fileName = 'slide-{0:D2}.png' -f [int]$page.page
  $bmp.Save((Join-Path $OutDir $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

Write-Output ('rendered {0} slides' -f $spec.pages.Count)
