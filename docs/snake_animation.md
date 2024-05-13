# Generate Animation

## Overview

The **Generate Animation** GitHub Action automates the generation of a snake game animation based on a GitHub user's contribution graph. This action creates visually appealing SVG animations that simulate a snake "eating" the user's contributions.

## Usage

### Trigger

The action is triggered in the following scenarios:

- **Scheduled Execution**: Runs automatically every 6 hours to update the animation.
- **Manual Execution**: Can be manually triggered from the Actions tab.
- **Push to Main Branch**: Also runs on every push to the main branch.

### Workflow Steps

1. **Generate SVG Animation**:
   - Utilizes the `Platane/snk/svg-only` action to generate SVG animation files.
   - Parameters:
     - `github_user_name`: Specifies the GitHub username for which the contribution graph is generated.
     - `outputs`: Specifies the paths for the generated SVG files, including both light and dark themes.
   - Environment Variables:
     - `GITHUB_TOKEN`: Authentication token for accessing the repository.

2. **Push to Output Branch**:
   - Uses the `crazy-max/ghaction-github-pages` action to push the generated SVG files to the `output` branch.
   - Parameters:
     - `target_branch`: Specifies the branch where the files will be pushed.
     - `build_dir`: Specifies the directory containing the generated SVG files.
   - Environment Variables:
     - `GITHUB_TOKEN`: Authentication token for accessing the repository.

## Configuration

- **GitHub Token**: The action requires a GitHub token (`secrets.GITHUB_TOKEN`) to authenticate and push changes to the repository.

## Note

- This action enhances the visual appearance of your GitHub profile by adding a dynamic snake animation to your contribution graph.
