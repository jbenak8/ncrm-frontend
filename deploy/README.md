# Nasazení ncrm-frontend do cloudu

Frontend se nasazuje jako kontejner: vícefázový `Dockerfile` (v kořeni repozitáře)
sestaví produkční bundle Vite a výsledek servíruje **nginx** (image
`nginxinc/nginx-unprivileged`, běží pod neprivilegovaným uživatelem na portu
**8080** — funguje tedy beze změn v Dockeru, na OpenShiftu i v Cloud Runu).

## Důležité principy

- **Proměnné `VITE_*` se zapékají do bundle při buildu** — předávají se jako
  `--build-arg` (auth režim, Keycloak nastavení), ne jako runtime env proměnné.
  Změna vyžaduje nový build image.
- **`BACKEND_URL` je runtime proměnná** — nginx přes ni proxuje `/api/*`
  a `/actuator/*` na backend (výchozí `http://ncrm-backend:8080`).
- Kontejner vystavuje endpoint `GET /healthz` pro liveness/readiness probes.
- SPA fallback: neznámé cesty vrací `index.html` (react-router).

## 1. Docker

```bash
# build (výchozí auth režim "db"; pro Keycloak přidejte další --build-arg)
docker build -t ncrm-frontend .

# spuštění — frontend na http://localhost:3000, backend běží na hostiteli
docker run -p 3000:8080 -e BACKEND_URL=http://host.docker.internal:8080 ncrm-frontend
```

Nebo přes Docker Compose (viz `docker-compose.yml` v kořeni):

```bash
docker compose up --build
```

Proměnné lze přenastavit v prostředí nebo v souboru `.env` vedle
`docker-compose.yml` (`VITE_AUTH_MODE`, `VITE_KEYCLOAK_*`, `BACKEND_URL`).

## 2. OpenShift

Manifesty: `deploy/openshift/ncrm-frontend.yaml` (ImageStream, BuildConfig,
Deployment, Service, Route s edge TLS).

```bash
oc new-project ncrm            # nebo existující projekt
# upravte v manifestu: git URL v BuildConfig, namespace v image Deploymentu,
# BACKEND_URL (název Service backendu) a případně host Route
oc apply -f deploy/openshift/ncrm-frontend.yaml
oc start-build ncrm-frontend --follow
oc get route ncrm-frontend     # URL aplikace
```

Alternativně bez BuildConfig: sestavte image lokálně/v CI, pushněte do registry
(např. quay.io) a v Deploymentu nastavte tento image (ImageStream a BuildConfig
pak smažte). Image běží pod libovolným UID — nevyžaduje žádné speciální SCC.

## 3. Google Cloud (Cloud Run)

Konfigurace Cloud Build: `deploy/gcp/cloudbuild.yaml` — build image, push do
Artifact Registry a deploy do Cloud Run v jednom kroku.

```bash
# jednorázově: repozitář v Artifact Registry + povolení API
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create ncrm --repository-format=docker --location=europe-west1

# build + deploy (z kořene repozitáře)
gcloud builds submit --config deploy/gcp/cloudbuild.yaml \
  --substitutions _BACKEND_URL=https://ncrm-backend-xxxx.a.run.app
```

Další substituce: `_REGION`, `_REPOSITORY`, `_SERVICE`, `_VITE_AUTH_MODE`,
`_VITE_KEYCLOAK_URL`, `_VITE_KEYCLOAK_REALM`, `_VITE_KEYCLOAK_CLIENT_ID`.

Ruční varianta bez Cloud Build:

```bash
docker build -t europe-west1-docker.pkg.dev/PROJECT/ncrm/ncrm-frontend:1.0.0 .
docker push europe-west1-docker.pkg.dev/PROJECT/ncrm/ncrm-frontend:1.0.0
gcloud run deploy ncrm-frontend \
  --image europe-west1-docker.pkg.dev/PROJECT/ncrm/ncrm-frontend:1.0.0 \
  --region europe-west1 --port 8080 --allow-unauthenticated \
  --set-env-vars BACKEND_URL=https://ncrm-backend-xxxx.a.run.app
```

Pozn.: Cloud Run vyžaduje, aby `BACKEND_URL` mířila na veřejně dosažitelný
backend (typicky druhá Cloud Run služba); alternativně lze frontend i backend
provozovat v GKE a použít interní Service DNS jako na OpenShiftu.
