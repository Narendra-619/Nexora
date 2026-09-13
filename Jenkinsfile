
pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        ECR_REGISTRY = '276096488420.dkr.ecr.ap-south-1.amazonaws.com'

        FRONTEND_REPO = "${ECR_REGISTRY}/nexora/frontend"
        BACKEND_REPO = "${ECR_REGISTRY}/nexora/backend"

        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Basic Tests') {
            steps {
                sh '''
                    echo "Running basic project checks..."

                    # Check project directories
                    test -d backend
                    test -d frontend
                    test -d frontend/social-frontend

                    # Check Dockerfiles
                    test -f backend/Dockerfile
                    test -f frontend/social-frontend/Dockerfile

                    # Check Kubernetes deployment manifests
                    test -f manifests/deployments/backend-deploy.yaml
                    test -f manifests/deployments/frontend-deploy.yaml

                    echo "✓ Project structure check passed"

                    # Check backend manifest
                    grep -q "nexora/backend" \
                        manifests/deployments/backend-deploy.yaml

                    # Check frontend manifest
                    grep -q "nexora/frontend" \
                        manifests/deployments/frontend-deploy.yaml

                    echo "✓ Kubernetes manifest check passed"

                    echo "All basic tests passed!"
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region ${AWS_REGION} |
                    docker login --username AWS --password-stdin ${ECR_REGISTRY}
                '''
            }
        }

        stage('Build & Push Backend') {
            steps {
                sh '''
                    echo "Building backend image..."

                    docker build \
                      -t ${BACKEND_REPO}:${IMAGE_TAG} \
                      ./backend

                    echo "Pushing backend image..."

                    docker push ${BACKEND_REPO}:${IMAGE_TAG}
                '''
            }
        }

        stage('Build & Push Frontend') {
            steps {
                sh '''
                    echo "Building frontend image..."

                    docker build \
                      --build-arg VITE_API_URL=/api \
                      -t ${FRONTEND_REPO}:${IMAGE_TAG} \
                      ./frontend/social-frontend

                    echo "Pushing frontend image..."

                    docker push ${FRONTEND_REPO}:${IMAGE_TAG}
                '''
            }
        }

        stage('Update Manifests') {
            steps {
                sh '''
                    echo "Updating Kubernetes image tags..."

                    sed -i "s|image:.*nexora/backend.*|image: ${BACKEND_REPO}:${IMAGE_TAG}|" \
                      manifests/deployments/backend-deploy.yaml

                    sed -i "s|image:.*nexora/frontend.*|image: ${FRONTEND_REPO}:${IMAGE_TAG}|" \
                      manifests/deployments/frontend-deploy.yaml

                    echo ""
                    echo "Updated backend image:"
                    grep "image:" manifests/deployments/backend-deploy.yaml

                    echo ""
                    echo "Updated frontend image:"
                    grep "image:" manifests/deployments/frontend-deploy.yaml
                '''
            }
        }

        stage('Commit & Push Manifests') {
            steps {
                sh '''
                    git config user.email "jenkins@ci.com"
                    git config user.name "Jenkins"

                    git add manifests/deployments/backend-deploy.yaml
                    git add manifests/deployments/frontend-deploy.yaml

                    if git diff --cached --quiet; then
                        echo "No manifest changes to commit."
                    else
                        git commit \
                          -m "ci: update image tags to build ${IMAGE_TAG} [skip ci]"

                        git push origin main
                    fi
                '''
            }
        }
    }

    post {

        success {
            echo """
            ==========================================
                    NEXORA PIPELINE SUCCESS
            ==========================================

            Build: ${BUILD_NUMBER}

            Backend Image:
            ${BACKEND_REPO}:${IMAGE_TAG}

            Frontend Image:
            ${FRONTEND_REPO}:${IMAGE_TAG}

            ✓ Tests passed
            ✓ Images built
            ✓ Images pushed to ECR
            ✓ Kubernetes manifests updated
            ✓ GitHub updated
            ✓ ArgoCD will synchronize the changes

            ==========================================
            """
        }

        failure {
            echo """
            ==========================================
                    NEXORA PIPELINE FAILED
            ==========================================

            Build: ${BUILD_NUMBER}

            Check the failed stage above
            for the exact error.

            ==========================================
            """
        }

        always {
            echo "Pipeline finished: ${currentBuild.currentResult}"
        }
    }
}

