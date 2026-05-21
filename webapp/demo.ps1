#測試前端功能 powershell -ExecutionPolicy Bypass -File .\demo.ps1

$API = "http://localhost:3001/api/event"

function Send-Event {
    param (
        [string]$Skill,
        [string]$Status,
        [object]$Data = @{}
    )

    $body = @{
        skill = $Skill
        status = $Status
        data = $Data
    } | ConvertTo-Json -Depth 10

    Invoke-RestMethod -Uri $API -Method Post -ContentType "application/json" -Body $body
    Write-Host "sent: $Skill $Status"
}

function Run-Step {
    param (
        [string]$Skill,
        [object]$Data = @{}
    )

    Send-Event -Skill $Skill -Status "started" -Data $Data
    Start-Sleep -Seconds 1
    Send-Event -Skill $Skill -Status "completed" -Data $Data
    Start-Sleep -Seconds 1
}

Write-Host "Starting Superpowers pipeline demo..."

Run-Step "brainstorming"
Run-Step "using-git-worktrees"
Run-Step "writing-plans"

Run-Step "gap-detection" @{
    gap = "Missing robust validation workflow"
    severity = "medium"
}

Run-Step "candidates-generated" @{
    count = 3
    candidates = @("validation-v1", "validation-v2", "validation-v3")
}

Run-Step "evaluation-result" @{
    winner = "validation-v2"
    scores = @{
        v1 = 72
        v2 = 88
        v3 = 65
    }
}

Run-Step "skill-deployed" @{
    skillName = "robust-validation"
}

Run-Step "subagent-driven-development"
Run-Step "test-driven-development"
Run-Step "requesting-code-review"
Run-Step "finishing-a-development-branch"

Write-Host "Demo completed."