param([Parameter(Mandatory=$true)][string]$InputJson,[Parameter(Mandatory=$true)][string]$OutputDir)
Add-Type -AssemblyName System.Speech
$ErrorActionPreference = 'Stop'
$items = Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Hanhan Desktop')
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$manifest = @()
foreach ($slide in $items.slides) {
  foreach ($line in $slide.lines) {
    $name = ('slide-{0:D2}-line-{1:D2}.wav' -f [int]$slide.slide, [int]$line.line)
    $target = Join-Path $OutputDir $name
    $synth.SetOutputToWaveFile($target)
    $synth.Speak($line.text)
    $synth.SetOutputToNull()
    $duration = [math]::Max(1.2, [math]::Round(([double]$line.text.Length * 0.075), 3))
    $manifest += [PSCustomObject]@{slide=[int]$slide.slide; line=[int]$line.line; speaker='narrator_female'; voice='narrator_female'; text=$line.text; durationSeconds=$duration; file=('audio/{0}' -f $name)}
  }
}
$synth.Dispose()
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path (Split-Path $OutputDir) 'tts-manifest.json') -Encoding UTF8
@{status='completed'; provider='Windows System.Speech'; files=$manifest} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path (Split-Path $OutputDir) 'tts-manifest.json') -Encoding UTF8
