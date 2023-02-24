#!/bin/bash
echo "Dependencies: docker, git"

config_read_file() {
    (grep -E "^${2}=" -m 1 "${1}" 2>/dev/null || echo "VAR=__UNDEFINED__") | head -n 1 | cut -d '=' -f 2-;
}

config_get() {
    val="$(config_read_file config.cfg "${1}")";
    printf -- "%s" "${val}";
}

BRANCH="$(config_get BRANCH)";
GIT_USERNAME="$(config_get GIT_USERNAME)";
GIT_PASSWORD="$(config_get GIT_PASSWORD)";
BRANCH="$(config_get BRANCH)";
SCOMPUTE_PORT="$(config_get SCOMPUTE_PORT)"
SERVICES_PORT="$(config_get SERVICES_PORT)"
PRIVATE_KEY="$(config_get PRIVATE_KEY)"
PUBLIC_KEY="$(config_get PUBLIC_KEY)"
TOKEN="$(config_get TOKEN)"

clone() {
	name=$1
    branch=$2
    rm -rf ./$name
	git clone -b $branch https://$GIT_USERNAME:$GIT_PASSWORD@github.com/swashapp/$name.git
}

sed -i 's/ETH_PRIVATE_KEY=.*$/ETH_PRIVATE_KEY='$PRIVATE_KEY'/g' docker-compose.yml
sed -i 's/APP_SIGNING_PRIVATE_KEY=.*$/APP_SIGNING_PRIVATE_KEY='$PRIVATE_KEY'/g' docker-compose.yml
sed -i 's/AUTH_ETH_PUBLIC_KEY=.*$/AUTH_ETH_PUBLIC_KEY='$PUBLIC_KEY'/g' docker-compose.yml
sed -i 's/APP_PORT=8090/APP_PORT='$SCOMPUTE_PORT'/g' docker-compose.yml
sed -i 's/APP_PORT=3020/APP_PORT='$SERVICES_PORT'/g' docker-compose.yml
sed -i 's/8090:8090/'$SCOMPUTE_PORT:$SCOMPUTE_PORT'/g' docker-compose.yml
sed -i 's/3020:3020/'$SERVICES_PORT:$SERVICES_PORT'/g' docker-compose.yml


echo 'TOKEN='$TOKEN > ../.env.test
echo 'NETWORK=5' >> ../.env.test
echo 'PRIVATE_KEY='$PRIVATE_KEY >> ../.env.test
echo 'HOST=http://127.0.0.1:'$SCOMPUTE_PORT >> ../.env.test
echo 'SERVICES_HOST=http://127.0.0.1:'$SERVICES_PORT >> ../.env.test


clone "fountain" "$BRANCH"
clone "services" "$BRANCH"
clone "aws-pricing-api" "$BRANCH"

docker-compose up -d

sleep 10

cd ..
npm run jest


cd docker
docker-compose down