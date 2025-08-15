# Assignment 3

Please make sure that all of the following items have been successfully completed, based on the [Fragments Microservice Specification](../README.md).

## API Server Checklist

- Clean code
- Docker Compose setup to run `fragments`, DynamoDB Local, and S3 LocalStack containers together in development and GitHub Actions CI workflow for integration testing
- Integration tests using [Hurl](https://hurl.dev/) and `docker compose` properly set-up with scripts to easily run them
- Integration test cases cover all major aspects of the Fragments HTTP API Specification (i.e., all routes, success and error cases) using HTTP Basic Auth (i.e., testing with Amazon Cognito not necessary)
- Unit tests and Integration tests run on every commit to `main` branch via GitHub Actions CI workflow
- Fragments Metadata stored in Amazon DynamoDB, with integration tests using DynamoDB Local container
- Fragments Data stored in Amazon S3, with integration tests using LocalStack container
- `fragments` server data model configurable via `.env` to run using either `MemoryDB` or AWS (S3, DynamoDB)
- `POST /fragments` can create any supported text, image or JSON fragments, with tests. See 4.3.
- `PUT /fragments:id` can update an authenticated user's existing fragment, with tests. See 4.6.
- `DELETE /fragments/:id` can delete an authenticated user's existing fragment, with tests. See 4.8.
- `GET /fragments/:id.ext` allows conversion of all fragment types to other supported types. Image conversions use [sharp](https://sharp.pixelplumbing.com/) module
- Conversion between all supported fragment types and conversions via `.ext`, with tests
- AWS account and ECR repository secrets properly stored in GitHub repo
- `fragments` Docker image automatically built and pushed to Amazon Elastic Container Registry (ECR) on every new git Tag via GitHub Actions CD workflow
- `fragments` Docker container automatically deployed to Elastic Container Service using pre-built Amazon ECR Docker image on every git tag via GitHub Actions CD workflow

### Bonus

Students who are interested in taking their project and AWS knowledge to the next level are encouraged to implement one or more additional features and/or AWS Services. Here are some suggestions (you are free to come up with your own as well, talk to your professor):

- HTTPS secure setup: Work through the walkthrough: [running on a custom domain over HTTPS](../../weeks/week-11/mycustomdomain-walkthrough.md) and get your server to use its own custom domain and SSL certificate.

- Search Functionality: Implement a search feature that allows users to search for fragments based on their metadata (e.g., type, size, creation/modification dates).

- Fragment Versioning: Allow users to keep track of different versions of a fragment. This could be useful if a fragment is updated frequently and users want to revert to a previous version.

- Fragment Sharing: Allow users to share fragments with other users, with appropriate permissions and security measures in place.

- Fragment Tagging: Implement a tagging system that allows users to categorize and organize their fragments. You could use Amazon Rekognition to automate image detection and labeling of image fragments

- Fragment Analytics: Provide users with analytics about their fragments, such as usage statistics, access patterns, etc.

- Text from Images: Implement the ability for users to convert image fragments to text using Amazon Textract for text extraction and OCR

## Front-End Web Testing UI Checklist

- Web app running on localhost and connecting to your API server running on AWS Elastic Container Service and authenticating via your Amazon Cognito User Pool.
- Support for users to create fragments of any type via the web app
- Support for users to view their fragments via the web app
- Support for users to update their existing fragments via the web app
- Support for users to delete their existing fragments via the web app
- Support for offline behavior (what if the internet is down when a student/factory worker tries to upload a fragment / load the fragments data, etc. You may need to do some extra research). Implement some PWA feature (progressive web application, persist data locally in the browser using indexedDB, cache, etc.)
- All features working in the web app (i.e., not via `console.log()`)

## Submission

You are asked to submit two things:

1. A document listing all necessary resources in your system, specifically:

   - Links to both private GitHub repos
   - Links to your public Docker Hub repos
   - Link to AWS Elastic Container Service hosted version of `fragments` API server (i.e., load balancer URL)
   - Link to successful GitHub Actions CI workflow run, showing eslint, unit tests, integration tests, and Docker image publish to Docker Hub
   - Link to successful GitHub Actions CD workflow run, showing Docker image publish to Amazon ECR, and deploy to AWS Elastic Container Service
   - Screenshot of running `npm run coverage` to show that you've been able to properly cover the majority of your files and lines of code. Make sure your coverage rate is high enough to reflect proper testing for all units of code (>80% and includes all necessary files).
   - List of deficiencies: any known bugs, unsupported spec requirements, missing tests, or other issues that you did not, or could not complete. Discuss what still needs to be done in order to complete these.

2. A video demonstration and walk-through of your system, uploaded as an **Unlisted Video** to YouTube (i.e., only the people you share the URL with will be able to see it). The presentation video should be between 5-10 minutes in length (no longer). It should include audio of you talking and a screen-capture of all the elements you discuss (i.e., you don’t have to be on camera if you aren’t comfortable doing so, it’s up to you). Use the video to give a walk-through of your final, completed system and all the technologies it uses.

Your walkthrough should include the following:

- Your `fragments` API server running on AWS Elastic Container Service (i.e., shows health check JSON response, with load balancer URL in the browser or via `curl`)
- Your `fragments-ui` web app running on localhost and connecting to a Docker Container running on AWS Elastic Container Service and your Amazon Cognito User Pool, doing the following:
  - User authenticating with Cognito Hosted UI and showing the metadata for all of their existing fragments
  - User creating a new JSON fragment
  - User creating a new Text fragment (e.g., text, HTML, Markdown)
  - User creating a new Image fragment
  - User converting between text fragment types (e.g., Markdown -> HTML)
  - User converting between image fragment types (e.g., PNG -> JPEG)
  - User modifying an existing fragment
  - User deleting an existing fragment
- Demonstrate how to access your ECS logs using CloudWatch. You should be able to call a `fragments` route (e.g., `POST /v1/fragments`) and then show the corresponding logs in CloudWatch for that request.
- Demonstrate that AWS is being used correctly. Show the user's data in Cognito, ECR, ECS, S3, DynamoDB, etc. and discuss how you are using these services. Prove that everything is working as it should, and that you understand what's going on.
- Discuss and demo any bonus features you experimented with or successfully added

Submit the URL to your YouTube video, and try accessing it in an Incognito/Private Browser Window to make sure it's accessible to your professor.
