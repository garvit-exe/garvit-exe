## Update Date Workflow

### Description:
This GitHub Actions workflow is designed to automatically update the current date in a Markdown file (`README.md`) every day at 00:00 IST (05:30 UTC). Additionally, it triggers on pushes to the main branch and can be manually triggered via workflow dispatch.

### Workflow File:
The workflow file is named `update-date.yml` and resides in the `.github/workflows` directory of the repository.

### Workflow Triggers:
- **Scheduled Cron Job**: Runs every day at 00:00 IST (05:30 UTC) using the cron schedule `30 5 * * *`.
- **Push to Main Branch**: Triggers on pushes to the `main` branch.
- **Manual Workflow Dispatch**: Can be manually triggered from the Actions tab.

### Workflow Steps:
1. **Checkout Repository**:
   - Action: `actions/checkout@v2`
   - Purpose: Checks out the repository to allow access to files for updating.

2. **Update Date**:
   - Script:
     ```bash
     sed -i "s|{{CURRENT_DATE}}|$(date +'%a, %d-%m-%Y')|g" README.md
     ```
   - Purpose: Replaces occurrences of `{{CURRENT_DATE}}` in `README.md` with the current date in the format `Day, DD-MM-YYYY`.

3. **Commit Changes**:
   - Script:
     ```bash
     git config --local user.email "action@github.com"
     git config --local user.name "GitHub Action"
     git add README.md
     git commit -m "Update current date in README" || echo "No changes to commit"
     git push
     ```
   - Purpose: Commits the changes made to `README.md` (if any) and pushes them to the remote repository.

### Example Usage:
- Automatic daily updates to the current date in `README.md`.
- Ensures the `README.md` file always displays the current date to users visiting the repository.
