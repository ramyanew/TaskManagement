// ============================================================
// Jenkinsfile — Playwright MCP Automation Pipeline
// ============================================================
// TRIGGER LOGIC (same pattern as your Mobileum Jenkins setup):
//   - Git push (webhook)  → Smoke suite (UI + API only, ~2 min)
//   - Nightly cron        → Full regression (all 7 layers, ~10 min)
//   - Manual              → User picks which layers to run
//
// WHAT THIS PIPELINE DOES:
//   1. Checks out code from Git
//   2. Installs dependencies (demo app + automation)
//   3. Starts the demo app in the background
//   4. Waits for the app to be healthy (health check)
//   5. Runs Playwright tests (scope depends on trigger)
//   6. Publishes HTML report + JUnit XML results
//   7. Stops the demo app
//   8. Sends email notification on failure
// ============================================================

pipeline {
    agent any

    // ── Trigger Configuration ───────────────────────────────
    triggers {
        // Nightly regression at 10 PM IST (Mon-Fri)
        cron('0 22 * * 1-5')

        // Webhook trigger — enable in Jenkins > Job > Configure > 
        // Build Triggers > "GitHub hook trigger for GITScm polling"
        // Then add webhook URL in GitHub: http://<jenkins-url>/github-webhook/
    }

    // ── Manual Build Parameters ─────────────────────────────
    // When someone clicks "Build with Parameters" in Jenkins,
    // they see these dropdown options
    parameters {
        choice(
            name: 'TEST_SCOPE',
            choices: ['auto', 'smoke', 'regression', 'ui', 'api', 'db', 'logs', 'security', 'accessibility', 'performance'],
            description: '''
                auto = Jenkins decides based on trigger (webhook→smoke, cron→regression)
                smoke = UI + API tests only (~2 min)
                regression = All 7 layers (~10 min)
                Or pick a specific layer to run
            '''
        )
        choice(
            name: 'BROWSER',
            choices: ['chromium', 'firefox', 'webkit'],
            description: 'Which browser to run tests in'
        )
    }

    // ── Environment Variables ────────────────────────────────
    environment {
        NODE_VERSION = '18'
        BASE_URL = 'http://localhost:3000'
        CI = 'true'                          // Enables retries + more workers
        PLAYWRIGHT_BROWSERS_PATH = '0'       // Use default browser location
    }

    // ── Pipeline Stages ─────────────────────────────────────
    stages {

        // ── STAGE 1: Checkout + Install ─────────────────────
        stage('Checkout & Install') {
            steps {
                echo '📦 Checking out code and installing dependencies...'

                // Checkout from Git
                checkout scm

                // Install demo app dependencies
                dir('demo-app') {
                    sh 'npm ci'    // ci = clean install (faster, uses package-lock.json)
                }

                // Install automation framework dependencies
                dir('automation') {
                    sh 'npm ci'
                    sh 'npx playwright install --with-deps chromium'  // Install browser + system deps
                }
            }
        }

        // ── STAGE 2: Start Demo App ─────────────────────────
        stage('Start Application') {
            steps {
                echo '🚀 Starting demo app in background...'

                dir('demo-app') {
                    // Start the app in background, redirect output to log file
                    // The & at the end makes it run in the background
                    sh 'nohup node server.js > ../app.log 2>&1 &'

                    // Save the process ID so we can stop it later
                    sh 'echo $! > ../app.pid'
                }

                // Wait for app to be ready (health check)
                // This retries every 2 seconds, up to 30 seconds
                sh '''
                    echo "Waiting for app to start..."
                    for i in $(seq 1 15); do
                        if curl -s http://localhost:3000/login > /dev/null 2>&1; then
                            echo "✅ App is ready!"
                            exit 0
                        fi
                        echo "  Attempt $i — not ready yet, waiting 2s..."
                        sleep 2
                    done
                    echo "❌ App failed to start within 30 seconds"
                    cat app.log
                    exit 1
                '''
            }
        }

        // ── STAGE 3: Determine Test Scope ───────────────────
        stage('Determine Test Scope') {
            steps {
                script {
                    // AUTO-DETECT LOGIC:
                    // If user selected 'auto', Jenkins decides based on what triggered the build
                    if (params.TEST_SCOPE == 'auto' || params.TEST_SCOPE == null) {

                        if (currentBuild.getBuildCauses('hudson.triggers.TimerTrigger$TimerTriggerCause').size() > 0) {
                            // Triggered by cron (nightly) → full regression
                            env.EFFECTIVE_SCOPE = 'regression'
                            echo '🕐 Nightly cron trigger detected → Full regression'

                        } else if (currentBuild.getBuildCauses('com.cloudbees.jenkins.GitHubPushCause').size() > 0) {
                            // Triggered by Git push webhook → smoke only
                            env.EFFECTIVE_SCOPE = 'smoke'
                            echo '🔀 Git push webhook detected → Smoke suite'

                        } else {
                            // Manual trigger with 'auto' selected → smoke (safe default)
                            env.EFFECTIVE_SCOPE = 'smoke'
                            echo '👤 Manual trigger with auto → Defaulting to smoke'
                        }

                    } else {
                        // User explicitly picked a scope
                        env.EFFECTIVE_SCOPE = params.TEST_SCOPE
                        echo "👤 User selected scope: ${env.EFFECTIVE_SCOPE}"
                    }
                }
            }
        }

        // ── STAGE 4: Run Tests ──────────────────────────────
        stage('Run Playwright Tests') {
            steps {
                echo "🧪 Running tests — scope: ${env.EFFECTIVE_SCOPE}"

                dir('automation') {
                    script {
                        // Build the npx playwright test command based on scope
                        def testCommand = 'npx playwright test'

                        switch (env.EFFECTIVE_SCOPE) {
                            case 'smoke':
                                // Smoke = UI + API tests only (fast feedback)
                                testCommand += ' tests/ui/ tests/api/'
                                break
                            case 'regression':
                                // Regression = everything (all 7 layers)
                                testCommand += '' // No filter = run all tests
                                break
                            case 'ui':
                                testCommand += ' tests/ui/'
                                break
                            case 'api':
                                testCommand += ' tests/api/'
                                break
                            case 'db':
                                testCommand += ' tests/db/'
                                break
                            case 'logs':
                                testCommand += ' tests/logs/'
                                break
                            case 'security':
                                testCommand += ' tests/security/'
                                break
                            case 'accessibility':
                                testCommand += ' tests/accessibility/'
                                break
                            case 'performance':
                                testCommand += ' tests/performance/'
                                break
                        }

                        // Add reporter for Jenkins
                        testCommand += ' --reporter=list,junit,html'

                        echo "Command: ${testCommand}"

                        // Run tests — don't fail the pipeline on test failures
                        // (we want to still publish reports even if tests fail)
                        def exitCode = sh(script: testCommand, returnStatus: true)
                        env.TEST_EXIT_CODE = exitCode.toString()

                        if (exitCode != 0) {
                            echo "⚠️ Some tests failed (exit code: ${exitCode})"
                            // Mark build as UNSTABLE (yellow), not FAILED (red)
                            currentBuild.result = 'UNSTABLE'
                        } else {
                            echo '✅ All tests passed!'
                        }
                    }
                }
            }
        }

        // ── STAGE 5: Publish Reports ────────────────────────
        stage('Publish Reports') {
            steps {
                echo '📊 Publishing test reports...'

                // Publish JUnit XML results (shows pass/fail in Jenkins UI)
                junit(
                    testResults: 'automation/test-results/results.xml',
                    allowEmptyResults: true
                )

                // Publish Playwright HTML report (detailed interactive report)
                publishHTML(target: [
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'automation/playwright-report',
                    reportFiles: 'index.html',
                    reportName: 'Playwright Test Report'
                ])

                // Archive test artifacts (screenshots, videos, traces)
                archiveArtifacts(
                    artifacts: 'automation/test-results/**/*',
                    allowEmptyArchive: true
                )
            }
        }
    }

    // ── Post-Build Actions ──────────────────────────────────
    post {
        always {
            echo '🧹 Cleaning up — stopping demo app...'

            // Stop the demo app
            sh '''
                if [ -f app.pid ]; then
                    kill $(cat app.pid) 2>/dev/null || true
                    rm -f app.pid
                    echo "Demo app stopped."
                fi
            '''
        }

        unstable {
            echo '⚠️ Build UNSTABLE — some tests failed'

            // Send email notification on failure
            // Configure in Jenkins > Manage Jenkins > Configure System > E-mail Notification
            emailext(
                subject: "⚠️ Playwright Tests UNSTABLE — ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <h2>Test Execution Summary</h2>
                    <p><b>Scope:</b> ${env.EFFECTIVE_SCOPE}</p>
                    <p><b>Status:</b> Some tests failed</p>
                    <p><b>Report:</b> <a href="${env.BUILD_URL}Playwright_20Test_20Report/">View HTML Report</a></p>
                    <p><b>Build:</b> <a href="${env.BUILD_URL}">${env.JOB_NAME} #${env.BUILD_NUMBER}</a></p>
                """,
                recipientProviders: [[$class: 'RequesterRecipientProvider']],
                to: 'qa-team@yourcompany.com',
                mimeType: 'text/html'
            )
        }

        failure {
            echo '❌ Build FAILED — pipeline error (not test failure)'
        }

        success {
            echo '✅ All tests passed!'
        }
    }
}
