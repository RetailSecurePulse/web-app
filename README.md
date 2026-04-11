# RpWebApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Production Build

To generate the production Angular bundle, run:

```bash
npm run build:prod
```

This uses the Angular `production` configuration and writes the output to `dist/`.

To build the production Docker image for the web app, run:

```bash
docker build --build-arg BUILD_CONFIG=production -t rp-web-app:prod .
```

The Dockerfile defaults `BUILD_CONFIG` to `production`, so this equivalent command also works:

```bash
docker build -t rp-web-app:prod .
```

If you are preparing a production deployment through Helm, make sure the generated image is used together with the production values file under [../RetailPulsePolyRepo/helm/values-prod.yaml](/Users/aungtuntun/SchoolProjects/SecuredRetailPulsePolyRepo/RetailPulsePolyRepo/helm/values-prod.yaml).

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
