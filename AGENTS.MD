# Agent Deployment & Workflow Instructions

이 파일은 Antigravity AI 에이전트가 이 프로젝트에서 작업을 수행할 때 반드시 준수해야 하는 규칙을 담고 있습니다.

## 1. 브랜치 및 배포 규칙 (Branch & Deployment)

*   **이중 푸시 필수**: 소스 코드를 수정하고 업데이트할 때는 반드시 `main` 브랜치와 `master` 브랜치 **모두**에 반영해야 합니다.
*   **권장 커맨드**:
    ```bash
    git add .
    git commit -m "작업 내용 요약"
    git push origin main
    git push origin main:master --force
    ```
*   **이유**: 현재 저장소 설정에 따라 `main` 혹은 `master` 중 어느 브랜치가 배포 브랜치로 사용될지 불확실하거나 혼용될 수 있으므로, 두 브랜치를 항상 동기화 상태로 유지합니다.

## 2. 데이터 저장 방식 (Data Storage)

*   **GitHub API 직접 저장**: 이 앱은 `data/index.json` 파일을 GitHub API를 통해 직접 수정하는 방식으로 데이터를 관리합니다.
*   **Google Sheets 연동 안 함**: 이전의 Google Sheets 연동 방식은 더 이상 사용하지 않으며, 모든 로직은 GitHub API 기반으로 동작해야 합니다.

## 3. 작업 확인 절차

*   코드를 푸시한 후에는 항상 **실제 배포 페이지(URL)**에 반영되었는지 확인해야 합니다.
*   반영이 안 된 경우 브랜치 동기화 상태를 재점검하십시오.
