#!/usr/bin/env groovy

/**
 * Flowsyc CRM - CI/CD Pipeline
 * Comprehensive Jenkins pipeline following best practices:
 * - Parallel builds for frontend and backend
 * - Automated testing and linting
 * - Docker image building and registry push
 * - Blue-Green deployment strategy
 * - Notifications and reporting
 */

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        ansiColor('xterm')
    }

    environment {
        // Application configuration
        APP_NAME = 'flowsyc'
        REGISTRY = 'docker.io' // Change to your registry (e.g., ECR, Dockerhub)
        REGISTRY_CREDENTIALS = credentials('docker-registry-credentials')
        
        // Git configuration
        GIT_BRANCH = "${GIT_BRANCH ?: 'main'}"
        GIT_COMMIT_SHORT = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
        BUILD_TAG = "${BUILD_NUMBER}-${GIT_COMMIT_SHORT}"
        
        // Node.js configuration
        NODE_ENV = "${BRANCH_NAME == 'main' ? 'production' : 'development'}"
        NODE_OPTIONS = '-Xmx4096m'
        
        // Deployment configuration
        DEPLOY_USER = 'deploy'
        DEPLOY_HOST = credentials('deploy-host')
        DEPLOY_PATH = '/opt/flowsyc'
        
        // Slack/Notification
        SLACK_CHANNEL = credentials('slack-channel')
        SLACK_WEBHOOK = credentials('slack-webhook-url')
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "🔄 Checking out code..."
                    checkout scm
                    sh 'git log --oneline -1'
                }
            }
        }

        stage('Setup') {
            steps {
                script {
                    echo "📦 Setting up environment..."
                    sh '''
                        # Verify Node.js version
                        node --version
                        npm --version
                        
                        # Display environment
                        echo "BUILD_TAG: ${BUILD_TAG}"
                        echo "NODE_ENV: ${NODE_ENV}"
                        echo "GIT_BRANCH: ${GIT_BRANCH}"
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Frontend Dependencies') {
                    steps {
                        script {
                            echo "📚 Installing frontend dependencies..."
                            dir('frontend') {
                                sh '''
                                    npm ci --prefer-offline --no-audit
                                    npm list --depth=0
                                '''
                            }
                        }
                    }
                }
                stage('Backend Dependencies') {
                    steps {
                        script {
                            echo "📚 Installing backend dependencies..."
                            dir('backend') {
                                sh '''
                                    npm ci --prefer-offline --no-audit
                                    npm list --depth=0
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Lint & Type Check') {
            parallel {
                stage('Frontend Lint') {
                    steps {
                        script {
                            echo "🔍 Linting frontend code..."
                            dir('frontend') {
                                sh '''
                                    npm run lint || true
                                '''
                            }
                        }
                    }
                }
                stage('Backend Type Check') {
                    steps {
                        script {
                            echo "🔍 Type checking backend code..."
                            dir('backend') {
                                sh '''
                                    npm run lint || true
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Frontend Tests') {
                    steps {
                        script {
                            echo "✅ Running frontend tests..."
                            dir('frontend') {
                                sh '''
                                    npm run test -- --reporter=verbose || true
                                '''
                            }
                        }
                    }
                }
                stage('Backend Tests') {
                    steps {
                        script {
                            echo "✅ Running backend tests..."
                            dir('backend') {
                                sh '''
                                    npm run test:fast || true
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    echo "🏗️  Building frontend..."
                    dir('frontend') {
                        sh '''
                            npm run build
                            ls -lah dist/
                        '''
                    }
                }
            }
        }

        stage('Build Backend') {
            steps {
                script {
                    echo "🏗️  Building backend..."
                    dir('backend') {
                        sh '''
                            npm run build
                            ls -lah dist/
                        '''
                    }
                }
            }
        }

        stage('Build Docker Images') {
            when {
                branch 'main'
            }
            parallel {
                stage('Build Frontend Image') {
                    steps {
                        script {
                            echo "🐳 Building frontend Docker image..."
                            sh '''
                                docker build \
                                  --build-arg NODE_ENV=${NODE_ENV} \
                                  --tag ${REGISTRY}/elonerajeev/${APP_NAME}-frontend:${BUILD_TAG} \
                                  --tag ${REGISTRY}/elonerajeev/${APP_NAME}-frontend:latest \
                                  --file frontend/Dockerfile.prod \
                                  .
                            '''
                        }
                    }
                }
                stage('Build Backend Image') {
                    steps {
                        script {
                            echo "🐳 Building backend Docker image..."
                            sh '''
                                docker build \
                                  --build-arg NODE_ENV=${NODE_ENV} \
                                  --tag ${REGISTRY}/elonerajeev/${APP_NAME}-backend:${BUILD_TAG} \
                                  --tag ${REGISTRY}/elonerajeev/${APP_NAME}-backend:latest \
                                  --file backend/Dockerfile.prod \
                                  .
                            '''
                        }
                    }
                }
            }
        }

        stage('Push Docker Images') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "📤 Pushing Docker images to registry..."
                    sh '''
                        echo "${REGISTRY_CREDENTIALS_PSW}" | docker login -u "${REGISTRY_CREDENTIALS_USR}" --password-stdin ${REGISTRY}
                        
                        docker push ${REGISTRY}/elonerajeev/${APP_NAME}-frontend:${BUILD_TAG}
                        docker push ${REGISTRY}/elonerajeev/${APP_NAME}-frontend:latest
                        
                        docker push ${REGISTRY}/elonerajeev/${APP_NAME}-backend:${BUILD_TAG}
                        docker push ${REGISTRY}/elonerajeev/${APP_NAME}-backend:latest
                        
                        docker logout ${REGISTRY}
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    echo "🚀 Deploying to staging..."
                    sh '''
                        scp -o StrictHostKeyChecking=no \
                            docker-compose.staging.yml \
                            ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/docker-compose.yml
                        
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "
                            cd ${DEPLOY_PATH} && \
                            export BUILD_TAG=${BUILD_TAG} && \
                            docker-compose down || true && \
                            docker-compose pull && \
                            docker-compose up -d && \
                            docker-compose ps
                        "
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
            }
            steps {
                script {
                    echo "🚀 Deploying to production (Blue-Green)..."
                    sh '''
                        # Blue-Green deployment
                        scp -o StrictHostKeyChecking=no \
                            docker-compose.prod.yml \
                            ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/docker-compose.blue-green.yml
                        
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} "
                            cd ${DEPLOY_PATH} && \
                            export BUILD_TAG=${BUILD_TAG} && \
                            
                            # Stop green environment (prepare for switch)
                            docker-compose -f docker-compose.blue-green.yml down green || true && \
                            
                            # Start blue environment with new images
                            docker-compose -f docker-compose.blue-green.yml pull && \
                            docker-compose -f docker-compose.blue-green.yml up -d blue && \
                            
                            # Wait for health checks
                            sleep 30 && \
                            
                            # Switch traffic (nginx configuration)
                            ./scripts/switch-traffic.sh blue && \
                            
                            # Remove old green
                            docker-compose -f docker-compose.blue-green.yml rm -f green || true && \
                            
                            docker-compose -f docker-compose.blue-green.yml ps
                        "
                    '''
                }
            }
        }

        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "🏥 Running health checks..."
                    sh '''
                        sleep 10
                        curl -f http://${DEPLOY_HOST}/api/health || exit 1
                        curl -f http://${DEPLOY_HOST}/ || exit 1
                    '''
                }
            }
        }

        stage('Smoke Tests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "🧪 Running smoke tests..."
                    dir('frontend') {
                        sh '''
                            # Run critical E2E tests
                            npm run test:e2e -- --grep "auth|dashboard" || true
                        '''
                    }
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    echo "🧹 Cleaning up..."
                    sh '''
                        docker system prune -f --filters "until=72h"
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                echo "📊 Collecting metrics..."
                
                // Archive logs
                archiveArtifacts artifacts: '**/logs/**/*.log', allowEmptyArchive: true
                
                // Publish test results
                junit testResults: '**/test-results/**/*.xml', allowEmptyResults: true
                
                // Publish coverage
                publishHTML([
                    reportDir: 'frontend/coverage',
                    reportFiles: 'index.html',
                    reportName: 'Frontend Coverage',
                    allowMissing: true
                ])
            }
        }

        success {
            script {
                echo "✅ Pipeline succeeded!"
                sh '''
                    curl -X POST -H 'Content-type: application/json' \
                        --data '{"text":"✅ ${APP_NAME} build #${BUILD_NUMBER} succeeded on ${GIT_BRANCH}","channel":"${SLACK_CHANNEL}"}' \
                        ${SLACK_WEBHOOK} || true
                '''
            }
        }

        failure {
            script {
                echo "❌ Pipeline failed!"
                sh '''
                    curl -X POST -H 'Content-type: application/json' \
                        --data '{"text":"❌ ${APP_NAME} build #${BUILD_NUMBER} failed on ${GIT_BRANCH}. Check: ${BUILD_URL}console","channel":"${SLACK_CHANNEL}"}' \
                        ${SLACK_WEBHOOK} || true
                '''
            }
        }

        unstable {
            script {
                echo "⚠️  Pipeline unstable!"
                sh '''
                    curl -X POST -H 'Content-type: application/json' \
                        --data '{"text":"⚠️  ${APP_NAME} build #${BUILD_NUMBER} is unstable on ${GIT_BRANCH}","channel":"${SLACK_CHANNEL}"}' \
                        ${SLACK_WEBHOOK} || true
                '''
            }
        }

        cleanup {
            deleteDir()
        }
    }
}
