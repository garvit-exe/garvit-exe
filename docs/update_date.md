## Update Date Image Workflow

### Description:
This GitHub Actions workflow is designed to automatically generate and update an image displaying the current date. The image is generated using Imagemagick with a custom font (`Roboto-Regular.ttf`) and added to the repository. It runs every day at 00:00 UTC (05:30 IST), triggers on pushes to the main branch, and can be manually triggered via workflow dispatch.

### Workflow File:
The workflow file is named `generate-date-image.yml` and resides in the `.github/workflows` directory of the repository.

### Workflow Triggers:
- **Scheduled Cron Job**: Runs every day at 00:00 UTC (05:30 IST) using the cron schedule `0 0 * * *`.
- **Push to Main Branch**: Triggers on pushes to the `main` branch.
- **Manual Workflow Dispatch**: Can be manually triggered from the Actions tab.

### Workflow Steps:
1. **Checkout Repository**:
   - Action: `actions/checkout@v3`
   - Purpose: Checks out the repository to allow access to files for updating.

2. **Install Dependencies**:
   - Script:
     ```bash
     npm install imagemagick
     curl -o Roboto-Regular.ttf -L https://github.com/garvit-exe/garvit-exe/raw/main/assets/Roboto-Regular.ttf
     ```
   - Purpose: Installs Imagemagick and downloads the custom font (`Roboto-Regular.ttf`) required for generating the date image.

3. **Generate Date Image**:
   - Script:
     ```bash
     DATE=$(date +'%a, %d-%m-%Y')
     convert xc:none -font Roboto-Regular.ttf -pointsize 20 -fill purple -gravity center label:"$DATE" date.png
     ```
   - Purpose: Generates an image with the current date using Imagemagick. The image is centered, with purple text color, and saved as `date.png`.

4. **Commit Changes**:
   - Script:
     ```bash
     git config --local user.email "garvitbudhiraja02@gmail.com"
     git config --local user.name "garvit-exe"
     git add date.png
     git commit -m "Update current date image" || echo "No changes to commit"
     git push
     ```
   - Purpose: Commits the generated date image (`date.png`) to the repository and pushes the changes to the remote repository.

### Example Usage:
- Automatic daily updates to the image displaying the current date.
- Ensures the repository always includes an up-to-date image of the current date.

### Configuring for Your Own Repository:
To configure this workflow for your own repository, follow these steps:
1. **Copy Workflow File**: Copy the contents of the workflow file (`generate-date-image.yml`) provided in this documentation.
2. **Create Workflow File**: Create a new file named `generate-date-image.yml` in the `.github/workflows` directory of your repository.
3. **Paste Contents**: Paste the copied contents into the newly created `generate-date-image.yml` file.
4. **Customize Script**: If you want to use a different font or text color, modify the script in the `Generate Date Image` step accordingly.
5. **Commit Changes**: Commit the changes to your repository. The workflow will start running automatically based on the triggers defined.

That's it! You have now configured the workflow to generate and update an image displaying the current date for your own repository.
