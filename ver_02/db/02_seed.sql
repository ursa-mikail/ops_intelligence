-- OPS INTELLIGENCE PLATFORM — SEED DATA

-- Assets
INSERT INTO assets (name, type, environment, region, owner, team, status, tags, description) VALUES
('api-gateway-prod-01', 'server', 'prod', 'us-east-1', 'infra@corp.com', 'Platform', 'healthy', ARRAY['gateway','critical','load-balanced'], 'Primary API gateway handling 50K RPS'),
('api-gateway-prod-02', 'server', 'prod', 'us-east-1', 'infra@corp.com', 'Platform', 'healthy', ARRAY['gateway','critical','load-balanced'], 'Secondary API gateway failover'),
('postgres-primary-prod', 'database', 'prod', 'us-east-1', 'dba@corp.com', 'Data', 'healthy', ARRAY['database','postgres','critical'], 'Primary PostgreSQL cluster 4TB'),
('postgres-replica-prod', 'database', 'prod', 'us-east-1', 'dba@corp.com', 'Data', 'healthy', ARRAY['database','postgres','replica'], 'Read replica for analytics'),
('redis-cluster-prod', 'server', 'prod', 'us-east-1', 'backend@corp.com', 'Backend', 'healthy', ARRAY['cache','redis','session'], 'Redis cluster 64GB cache'),
('k8s-node-worker-01', 'container', 'prod', 'us-east-1', 'devops@corp.com', 'DevOps', 'healthy', ARRAY['kubernetes','worker'], 'K8s worker node pool A'),
('k8s-node-worker-02', 'container', 'prod', 'us-east-1', 'devops@corp.com', 'DevOps', 'degraded', ARRAY['kubernetes','worker','degraded'], 'K8s worker node pool B - disk pressure'),
('k8s-node-worker-03', 'container', 'prod', 'us-west-2', 'devops@corp.com', 'DevOps', 'healthy', ARRAY['kubernetes','worker'], 'K8s worker node pool C west'),
('auth-service-prod', 'service', 'prod', 'us-east-1', 'security@corp.com', 'Security', 'healthy', ARRAY['auth','oauth','identity'], 'OAuth2/OIDC identity service'),
('payment-service-prod', 'service', 'prod', 'us-east-1', 'payments@corp.com', 'Backend', 'healthy', ARRAY['payment','pci','critical'], 'Stripe integration payment processor'),
('notification-service', 'service', 'prod', 'us-east-1', 'backend@corp.com', 'Backend', 'degraded', ARRAY['notifications','email','sms'], 'Email and SMS notification service'),
('cdn-cloudfront-prod', 'network', 'prod', 'global', 'infra@corp.com', 'Platform', 'healthy', ARRAY['cdn','cloudfront','edge'], 'CloudFront CDN global distribution'),
('vpc-main-prod', 'network', 'prod', 'us-east-1', 'security@corp.com', 'Security', 'healthy', ARRAY['vpc','network','firewall'], 'Production VPC with WAF'),
('monitoring-stack', 'service', 'prod', 'us-east-1', 'devops@corp.com', 'DevOps', 'healthy', ARRAY['monitoring','prometheus','grafana'], 'Prometheus + Grafana + AlertManager'),
('data-pipeline-etl', 'service', 'prod', 'us-east-1', 'data@corp.com', 'Data', 'healthy', ARRAY['etl','airflow','data'], 'Apache Airflow data pipelines'),
('search-elasticsearch', 'server', 'prod', 'us-east-1', 'backend@corp.com', 'Backend', 'healthy', ARRAY['search','elasticsearch','log'], 'Elasticsearch cluster for search and logs'),
('backup-s3-prod', 'storage', 'prod', 'us-east-1', 'dba@corp.com', 'Data', 'healthy', ARRAY['backup','s3','storage'], 'S3 backup buckets with lifecycle'),
('staging-api-01', 'server', 'staging', 'us-east-1', 'devops@corp.com', 'DevOps', 'healthy', ARRAY['staging','api'], 'Staging API environment'),
('dev-database-01', 'database', 'dev', 'us-east-1', 'dev@corp.com', 'Engineering', 'healthy', ARRAY['dev','database'], 'Dev PostgreSQL instance'),
('waf-shield-prod', 'network', 'prod', 'global', 'security@corp.com', 'Security', 'critical', ARRAY['waf','security','ddos'], 'AWS WAF + Shield - DDoS event detected');

-- Vulnerabilities
INSERT INTO vulnerabilities (cve_id, asset_id, severity, cvss_score, title, description, affected_component, resolution, status, discovered_at) VALUES
('CVE-2024-3094', 1, 'critical', 10.0, 'XZ Utils Backdoor', 'Malicious code in xz/liblzma 5.6.0-5.6.1 allows remote code execution via SSH. Supply chain attack.', 'xz-utils 5.6.1', 'Downgrade to xz-utils 5.4.6 immediately. Check IOCs. Rotate SSH keys.', 'in_progress', NOW() - INTERVAL '30 days'),
('CVE-2024-21762', 2, 'critical', 9.6, 'FortiOS SSL-VPN RCE', 'Out-of-bounds write in FortiOS allows unauthenticated RCE via crafted HTTP requests.', 'FortiOS 7.4.2', 'Upgrade to FortiOS 7.4.3+. Disable SSL-VPN if not needed.', 'open', NOW() - INTERVAL '45 days'),
('CVE-2024-1709', 3, 'critical', 10.0, 'ConnectWise ScreenConnect Auth Bypass', 'Authentication bypass allows unauthenticated access to all functionality.', 'ScreenConnect 23.9.7', 'Update to version 23.9.8 immediately. No workaround available.', 'resolved', NOW() - INTERVAL '60 days'),
('CVE-2023-44487', 1, 'high', 7.5, 'HTTP/2 Rapid Reset Attack', 'Flaw in HTTP/2 protocol allows RST_STREAM flood causing DoS.', 'nginx 1.24.0', 'Upgrade nginx to 1.25.3+. Configure max concurrent streams.', 'resolved', NOW() - INTERVAL '90 days'),
('CVE-2024-23897', 6, 'high', 9.8, 'Jenkins Arbitrary File Read', 'Jenkins CLI allows unauthenticated file read leading to RCE via credential exposure.', 'Jenkins 2.441', 'Upgrade Jenkins to 2.442+. Disable CLI if not required.', 'in_progress', NOW() - INTERVAL '20 days'),
('CVE-2024-27198', 7, 'critical', 9.8, 'TeamCity Auth Bypass', 'JetBrains TeamCity before 2023.11.4 allows auth bypass leading to admin access.', 'TeamCity 2023.11.3', 'Upgrade to 2023.11.4 immediately. Rotate all credentials.', 'open', NOW() - INTERVAL '15 days'),
('CVE-2024-6387', 9, 'critical', 8.1, 'regreSSHion OpenSSH RCE', 'Signal handler race condition in OpenSSH allows unauthenticated RCE on glibc Linux.', 'OpenSSH 9.7p1', 'Upgrade OpenSSH to 9.8p1. Set LoginGraceTime=0 as interim mitigation.', 'in_progress', NOW() - INTERVAL '10 days'),
('CVE-2024-4577', 10, 'critical', 9.8, 'PHP CGI Argument Injection', 'PHP CGI parameter injection allows unauthenticated RCE on Windows configs.', 'PHP 8.3.6', 'Upgrade PHP to 8.3.8. Apply rewrite rules. Disable CGI mode.', 'open', NOW() - INTERVAL '5 days'),
('CVE-2023-23397', 11, 'high', 9.8, 'Microsoft Outlook NTLM Relay', 'Zero-click vulnerability allows NTLM hash theft without user interaction.', 'Microsoft Outlook 2021', 'Apply MS23-023 patch. Block outbound SMB. Enable Protected Users group.', 'resolved', NOW() - INTERVAL '120 days'),
('CVE-2024-30078', 12, 'high', 8.8, 'Windows WiFi Driver RCE', 'RCE vulnerability in Windows WiFi drivers via crafted 802.11 frames.', 'Windows Server 2022', 'Apply June 2024 Patch Tuesday updates.', 'accepted', NOW() - INTERVAL '25 days'),
('CVE-2024-21413', 13, 'critical', 9.8, 'Microsoft Outlook Moniker Link', 'Hyperlink processing flaw bypasses Protected View enabling code execution.', 'Microsoft Outlook', 'Apply MS24-002 patch. Disable hyperlink processing in untrusted emails.', 'open', NOW() - INTERVAL '35 days'),
('CVE-2024-1086', 14, 'high', 7.8, 'Linux Kernel netfilter UAF', 'Use-after-free in Linux netfilter nf_tables allows local privilege escalation.', 'Linux kernel 6.7.3', 'Upgrade kernel to 6.7.4+.', 'in_progress', NOW() - INTERVAL '50 days');

-- Incidents
INSERT INTO incidents (asset_id, title, severity, category, frequency, intensity, start_time, end_time, resolved, mttr_minutes, impact, root_cause) VALUES
(1,  'API Gateway Latency Spike',          'high',     'performance',     1, 8.5, NOW()-INTERVAL '2 days',    NOW()-INTERVAL '1 day 22 hours',  true,  120,  'P1 - 15% of requests timing out',        'Memory leak in request handler pool'),
(3,  'PostgreSQL Replication Lag',         'critical', 'database',        1, 9.2, NOW()-INTERVAL '5 days',    NOW()-INTERVAL '4 days 20 hours', true,  240,  'P0 - Read replicas 4 hours behind',      'Network partition between AZs'),
(20, 'DDoS Attack - WAF Event',            'critical', 'security',        3, 9.8, NOW()-INTERVAL '1 day',     NULL,                             false, NULL, 'P0 - 2M RPS attack partial degradation', 'Botnet targeting payment endpoints'),
(7,  'K8s Node Disk Pressure',             'medium',   'infrastructure',  2, 5.0, NOW()-INTERVAL '3 days',    NOW()-INTERVAL '2 days 18 hours', true,  90,   'P2 - Pod evictions on worker-02',        'Log rotation misconfiguration'),
(11, 'Notification Service Failures',      'high',     'application',     5, 7.0, NOW()-INTERVAL '7 days',    NOW()-INTERVAL '6 days 12 hours', true,  360,  'P1 - 30% email delivery failure',        'SMTP rate limits exceeded'),
(9,  'Auth Service Token Validation Error','high',     'security',        1, 7.8, NOW()-INTERVAL '14 days',   NOW()-INTERVAL '13 days 23 hours',true,  60,   'P1 - JWT validation rejecting tokens',   'Certificate rotation timing issue'),
(5,  'Redis Cluster Memory Exhaustion',    'critical', 'performance',     1, 9.5, NOW()-INTERVAL '20 days',   NOW()-INTERVAL '19 days 16 hours',true,  45,   'P0 - Cache miss rate 95%',               'Session data not expiring properly'),
(10, 'Payment Service Timeout',            'critical', 'application',     2, 8.9, NOW()-INTERVAL '30 days',   NOW()-INTERVAL '29 days 22 hours',true,  180,  'P0 - Payment failures 8 minutes',        'Stripe API rate limit hit during promo'),
(15, 'ETL Pipeline Failure',               'medium',   'data',            3, 6.5, NOW()-INTERVAL '40 days',   NOW()-INTERVAL '39 days 20 hours',true,  480,  'P2 - Daily reports delayed 8 hours',     'Schema change broke pipeline ingestion'),
(16, 'Elasticsearch Index Corruption',     'high',     'data',            1, 8.0, NOW()-INTERVAL '55 days',   NOW()-INTERVAL '54 days',         true,  720,  'P1 - Search unavailable 12 hours',       'Ungraceful node shutdown during reindex'),
(1,  'API Rate Limit Cascade',             'medium',   'performance',     4, 5.5, NOW()-INTERVAL '65 days',   NOW()-INTERVAL '64 days 18 hours',true,  30,   'P2 - Third-party integrations throttled','Misconfigured rate limit headers'),
(6,  'K8s Deployment Rollout Failure',     'high',     'infrastructure',  1, 7.2, NOW()-INTERVAL '75 days',   NOW()-INTERVAL '74 days 20 hours',true,  150,  'P1 - New version failed health checks',  'Readiness probe misconfiguration'),
(3,  'Database Connection Pool Exhaustion','critical', 'database',        2, 9.0, NOW()-INTERVAL '90 days',   NOW()-INTERVAL '89 days 22 hours',true,  35,   'P0 - App cannot connect to DB',          'Connection leak in ORM retry logic'),
(12, 'CDN Cache Poisoning Attempt',        'high',     'security',        1, 7.5, NOW()-INTERVAL '100 days',  NOW()-INTERVAL '99 days 23 hours',true,  20,   'P1 - Malicious cache headers detected',  'Missing cache-control validation'),
(9,  'SSO Federation Outage',              'critical', 'security',        1, 9.3, NOW()-INTERVAL '110 days',  NOW()-INTERVAL '109 days 20 hours',true, 240,  'P0 - All SSO logins failing 4 hours',    'IdP certificate expired');

-- System Drifts
INSERT INTO system_drifts (asset_id, drift_type, component, expected_value, actual_value, severity, change_count) VALUES
(1,  'config',     'nginx worker_processes',    'auto',           '4',             'low',      1),
(1,  'config',     'nginx client_max_body_size','10m',            '100m',          'high',     3),
(3,  'config',     'pg max_connections',        '200',            '500',           'medium',   2),
(3,  'config',     'pg shared_buffers',         '4GB',            '2GB',           'high',     1),
(6,  'package',    'kubectl version',           '1.29.0',         '1.28.5',        'medium',   1),
(7,  'permission', '/var/log permissions',      '755',            '777',           'critical', 5),
(9,  'secret',     'JWT secret rotation',       '90 days',        '387 days',      'critical', 0),
(10, 'config',     'payment timeout_ms',        '5000',           '30000',         'high',     2),
(11, 'network',    'SMTP relay whitelist',      '10.0.0.0/8',     '0.0.0.0/0',     'critical', 1),
(14, 'package',    'prometheus version',        '2.50.0',         '2.47.2',        'low',      0),
(15, 'config',     'airflow max_active_runs',   '16',             '64',            'medium',   4),
(16, 'config',     'ES heap_size',              '50% RAM',        '4GB fixed',     'high',     1),
(20, 'config',     'WAF rate_limit_rps',        '10000',          '100000',        'critical', 2),
(5,  'config',     'redis maxmemory-policy',    'allkeys-lru',    'noeviction',    'critical', 1),
(13, 'network',    'VPC flow logs',             'enabled',        'disabled',      'high',     0);

-- Cost Records
INSERT INTO cost_records (period, category, subcategory, amount, provider, resource_id) VALUES
('2025-12-01','compute',    'EC2 instances',              48200.00,'AWS',     'ec2-prod'),
('2025-12-01','storage',    'S3 + EBS',                    8400.00,'AWS',     's3-ebs-prod'),
('2025-12-01','network',    'Data transfer + CloudFront', 12300.00,'AWS',     'net-prod'),
('2025-12-01','monitoring', 'CloudWatch + Datadog',        4200.00,'Datadog', 'mon-prod'),
('2025-12-01','platform',   'EKS + RDS + ElastiCache',   22100.00,'AWS',     'platform-prod'),
('2025-12-01','security',   'Shield + WAF + GuardDuty',   3800.00,'AWS',     'sec-prod'),
('2025-12-01','license',    'SaaS tools',                  9200.00,'Various', 'lic-prod'),
('2026-01-01','compute',    'EC2 instances',              51000.00,'AWS',     'ec2-prod'),
('2026-01-01','storage',    'S3 + EBS',                    8900.00,'AWS',     's3-ebs-prod'),
('2026-01-01','network',    'Data transfer + CloudFront', 13100.00,'AWS',     'net-prod'),
('2026-01-01','monitoring', 'CloudWatch + Datadog',        4200.00,'Datadog', 'mon-prod'),
('2026-01-01','platform',   'EKS + RDS + ElastiCache',   23400.00,'AWS',     'platform-prod'),
('2026-01-01','security',   'Shield + WAF + GuardDuty',   3900.00,'AWS',     'sec-prod'),
('2026-01-01','license',    'SaaS tools',                  9500.00,'Various', 'lic-prod'),
('2026-02-01','compute',    'EC2 instances',              49800.00,'AWS',     'ec2-prod'),
('2026-02-01','storage',    'S3 + EBS',                    9200.00,'AWS',     's3-ebs-prod'),
('2026-02-01','network',    'Data transfer + CloudFront', 12800.00,'AWS',     'net-prod'),
('2026-02-01','monitoring', 'CloudWatch + Datadog',        4500.00,'Datadog', 'mon-prod'),
('2026-02-01','platform',   'EKS + RDS + ElastiCache',   23800.00,'AWS',     'platform-prod'),
('2026-02-01','security',   'Shield + WAF + GuardDuty',   5200.00,'AWS',     'sec-prod'),
('2026-02-01','license',    'SaaS tools',                  9800.00,'Various', 'lic-prod'),
('2026-03-01','compute',    'EC2 instances',              53400.00,'AWS',     'ec2-prod'),
('2026-03-01','storage',    'S3 + EBS',                    9800.00,'AWS',     's3-ebs-prod'),
('2026-03-01','network',    'Data transfer + CloudFront', 14200.00,'AWS',     'net-prod'),
('2026-03-01','monitoring', 'CloudWatch + Datadog',        4800.00,'Datadog', 'mon-prod'),
('2026-03-01','platform',   'EKS + RDS + ElastiCache',   25100.00,'AWS',     'platform-prod'),
('2026-03-01','security',   'Shield + WAF + GuardDuty',   6800.00,'AWS',     'sec-prod'),
('2026-03-01','license',    'SaaS tools',                 10200.00,'Various', 'lic-prod'),
('2026-04-01','compute',    'EC2 instances',              56200.00,'AWS',     'ec2-prod'),
('2026-04-01','storage',    'S3 + EBS',                   10400.00,'AWS',     's3-ebs-prod'),
('2026-04-01','network',    'Data transfer + CloudFront', 15100.00,'AWS',     'net-prod'),
('2026-04-01','monitoring', 'CloudWatch + Datadog',        5100.00,'Datadog', 'mon-prod'),
('2026-04-01','platform',   'EKS + RDS + ElastiCache',   26800.00,'AWS',     'platform-prod'),
('2026-04-01','security',   'Shield + WAF + GuardDuty',   8200.00,'AWS',     'sec-prod'),
('2026-04-01','license',    'SaaS tools',                 11000.00,'Various', 'lic-prod'),
('2026-05-01','compute',    'EC2 instances',              58900.00,'AWS',     'ec2-prod'),
('2026-05-01','storage',    'S3 + EBS',                   11200.00,'AWS',     's3-ebs-prod'),
('2026-05-01','network',    'Data transfer + CloudFront', 16400.00,'AWS',     'net-prod'),
('2026-05-01','monitoring', 'CloudWatch + Datadog',        5400.00,'Datadog', 'mon-prod'),
('2026-05-01','platform',   'EKS + RDS + ElastiCache',   28200.00,'AWS',     'platform-prod'),
('2026-05-01','security',   'Shield + WAF + GuardDuty',   9100.00,'AWS',     'sec-prod'),
('2026-05-01','license',    'SaaS tools',                 11800.00,'Various', 'lic-prod');

-- Compliance Controls
INSERT INTO compliance_controls (framework, control_id, control_name, status, score, last_assessed, remediation, priority) VALUES
('SOC2',    'CC1.1', 'Control Environment',           'pass',    95.0, NOW()-INTERVAL '7 days',  NULL,                                                                        'low'),
('SOC2',    'CC2.1', 'Communication and Information', 'partial', 72.0, NOW()-INTERVAL '7 days',  'Update security awareness training completion to 100%',                     'medium'),
('SOC2',    'CC6.1', 'Logical Access Controls',       'fail',    45.0, NOW()-INTERVAL '7 days',  'Implement MFA for all privileged accounts. Remediate within 30 days.',      'critical'),
('SOC2',    'CC7.1', 'System Operations',             'pass',    91.0, NOW()-INTERVAL '7 days',  NULL,                                                                        'low'),
('SOC2',    'CC8.1', 'Change Management',             'partial', 68.0, NOW()-INTERVAL '7 days',  'Enforce change approval workflow for all production changes',               'high'),
('SOC2',    'CC9.1', 'Risk Mitigation',               'fail',    52.0, NOW()-INTERVAL '7 days',  'Complete formal risk assessment documentation by Q2',                       'high'),
('HIPAA',   '164.308a', 'Security Officer',           'pass',   100.0, NOW()-INTERVAL '14 days', NULL,                                                                        'low'),
('HIPAA',   '164.308b', 'Business Associate Agreements','partial',78.0,NOW()-INTERVAL '14 days', '3 vendor BAAs pending renewal - escalate to legal',                         'high'),
('HIPAA',   '164.312a', 'Access Control',             'fail',    41.0, NOW()-INTERVAL '14 days', 'PHI access logs missing for 2 data stores. Enable audit logging immediately.','critical'),
('HIPAA',   '164.312b', 'Audit Controls',             'partial', 65.0, NOW()-INTERVAL '14 days', 'Extend log retention to 6 years for PHI-adjacent systems',                  'high'),
('HIPAA',   '164.312e', 'Transmission Security',      'pass',    88.0, NOW()-INTERVAL '14 days', 'Review TLS 1.0/1.1 deprecation on legacy endpoints',                        'medium'),
('GDPR',    'Art.5',  'Data Processing Principles',   'pass',    90.0, NOW()-INTERVAL '21 days', NULL,                                                                        'low'),
('GDPR',    'Art.13', 'Transparency and Privacy',     'partial', 74.0, NOW()-INTERVAL '21 days', 'Update privacy notice to include AI/ML data usage',                         'medium'),
('GDPR',    'Art.17', 'Right to Erasure',             'fail',    38.0, NOW()-INTERVAL '21 days', 'Data deletion workflow broken for 4 systems. Fix and test by end of month.', 'critical'),
('GDPR',    'Art.25', 'Privacy by Design',            'partial', 61.0, NOW()-INTERVAL '21 days', 'Conduct DPIA for new ML pipeline before launch',                            'high'),
('GDPR',    'Art.32', 'Security of Processing',       'pass',    82.0, NOW()-INTERVAL '21 days', 'Encrypt 2 remaining unencrypted data stores',                               'medium'),
('PCI-DSS', 'Req.1',  'Network Security Controls',    'pass',    93.0, NOW()-INTERVAL '30 days', NULL,                                                                        'low'),
('PCI-DSS', 'Req.3',  'Cardholder Data Protection',  'pass',    97.0, NOW()-INTERVAL '30 days', NULL,                                                                        'low'),
('PCI-DSS', 'Req.6',  'Secure Systems and Software',  'partial', 71.0, NOW()-INTERVAL '30 days', 'Patch 3 critical CVEs in CDE scope within 48 hours',                        'critical'),
('PCI-DSS', 'Req.8',  'User Identification and Auth', 'fail',    55.0, NOW()-INTERVAL '30 days', 'Enable MFA for all CDE access. Shared accounts must be eliminated.',         'critical');

-- Team Members
INSERT INTO team_members (name, role, team, incidents_handled, avg_mttr_minutes, on_call_hours, satisfaction_score, certifications, availability) VALUES
('Sarah Chen',      'Principal SRE',            'Platform',    47, 42.5,  280, 8.8, ARRAY['CKA','AWS-SAP','CISSP'],              'active'),
('Marcus Johnson',  'Senior DevOps Engineer',   'DevOps',      38, 68.2,  220, 7.9, ARRAY['AWS-SOA','Terraform-Associate'],      'active'),
('Elena Rodriguez', 'Security Engineer',        'Security',    29, 31.0,  180, 9.1, ARRAY['CISSP','CEH','AWS-Security'],         'active'),
('David Kim',       'Staff Backend Engineer',   'Backend',     22, 55.8,  140, 8.2, ARRAY['AWS-Developer'],                     'active'),
('Priya Patel',     'Data Engineer',            'Data',        15, 120.4,  80, 8.5, ARRAY['dbt-Analyst','Airflow-Certified'],   'active'),
('James Thompson',  'Site Reliability Engineer','Platform',    31, 78.3,  200, 7.4, ARRAY['CKA','AWS-SOA'],                     'active'),
('Aisha Williams',  'Cloud Security Architect', 'Security',    18, 25.6,  120, 9.4, ARRAY['CCSP','CISM','AWS-Security'],        'active'),
('Ryan Martinez',   'DevOps Engineer',          'DevOps',      25, 91.2,  160, 7.1, ARRAY['AWS-SAA'],                           'on-leave'),
('Lisa Park',       'DBA',                      'Data',        19, 62.8,  100, 8.0, ARRAY['PostgreSQL-Associate'],               'active'),
('Tom Wilson',      'Platform Engineer',        'Platform',    12, 110.5,  60, 6.8, ARRAY[]::TEXT[],                            'active');

-- Risks
INSERT INTO risks (title, category, probability, impact, risk_score, status, owner, mitigation, due_date, blockers) VALUES
('Critical CVE-6387 regreSSHion not patched on all nodes', 'security',    'high',   'Unauthenticated RCE on all OpenSSH servers',                          95, 'open',        'Elena Rodriguez', 'Emergency patch window scheduled. Interim: restrict SSH to VPN only.',                       '2026-05-20', ARRAY['Change freeze window','Requires maintenance mode']),
('GDPR Art.17 Right to Erasure broken - regulatory fine risk','compliance','high',   'Regulatory fine up to 4% global revenue (~$12M)',                    92, 'in_progress', 'Aisha Williams',  'Engineering sprint dedicated. Legal notified. DPA engagement pending.',                     '2026-05-31', ARRAY['Cross-team dependency on 4 legacy systems']),
('DDoS attack ongoing - WAF capacity at 94%',              'operational', 'high',   'Full service outage if mitigation fails',                             88, 'open',        'Sarah Chen',      'AWS Shield Advanced engaged. Traffic scrubbing active. Backup routes configured.',           '2026-05-15', ARRAY[]::TEXT[]),
('Payment service single point of failure',                'operational', 'medium', 'Revenue loss $50K per minute during outage',                          76, 'open',        'David Kim',       'Multi-region deployment planned for Q3. Interim: enhanced monitoring.',                     '2026-08-01', ARRAY['Budget approval pending','PCI-DSS scope expansion required']),
('SOC2 CC6.1 MFA gap - audit finding',                     'compliance',  'high',   'SOC2 Type II certification at risk',                                  82, 'in_progress', 'Aisha Williams',  'Okta MFA rollout 68% complete. Target 100% by May 31.',                                     '2026-05-31', ARRAY['Legacy app incompatibility']),
('k8s-node-worker-02 disk pressure escalation risk',       'operational', 'medium', 'Pod evictions causing service degradation',                           65, 'open',        'Marcus Johnson',  'Log rotation fixed. Node drain scheduled for disk expansion.',                               '2026-05-17', ARRAY[]::TEXT[]),
('Supply chain attack vector - no SBOM tracking',          'security',    'medium', 'Undetected malicious dependencies like XZ attack',                    71, 'open',        'Elena Rodriguez', 'SBOM generation tool evaluation in progress. Syft + Grype POC running.',                    '2026-06-30', ARRAY['Tool selection not finalized']),
('Vendor BAA renewals overdue - HIPAA risk',               'compliance',  'medium', 'HIPAA violation if PHI shared with non-BAA vendors',                  68, 'in_progress', 'Priya Patel',     'Legal review initiated on 3 vendors. Escalated to CISO.',                                   '2026-05-25', ARRAY['Legal team bandwidth']);

-- Deliverables
INSERT INTO deliverables (title, type, status, priority, assigned_team, target_date, completion_pct, dependencies, notes) VALUES
('Kubernetes 1.30 cluster upgrade',            'upgrade',   'in_progress', 'critical', 'DevOps',       '2026-05-30', 65,  ARRAY['Node drain automation','Helm chart updates'],          'Rolling upgrade in progress. 7/12 nodes complete.'),
('OpenSSH emergency patch - CVE-6387',         'patch',     'in_progress', 'critical', 'Platform',     '2026-05-15', 80,  ARRAY[]::TEXT[],                                             'Patched 16/20 systems. Remaining 4 in maintenance window.'),
('SOC2 Type II audit preparation',             'audit',     'in_progress', 'high',     'Security',     '2026-06-15', 45,  ARRAY['MFA rollout','CC6.1 remediation','Evidence collection'],'Auditor engagement confirmed. Evidence portal setup complete.'),
('GDPR Right to Erasure fix',                  'feature',   'in_progress', 'critical', 'Engineering',  '2026-05-31', 30,  ARRAY['Legacy system mapping','Legal sign-off'],              'Engineering sprint 2 of 4. Blockers on legacy CRM integration.'),
('Multi-region payment service DR',            'migration', 'planned',     'high',     'Backend',      '2026-08-01', 5,   ARRAY['PCI-DSS scope review','Budget approval'],              'Architecture design review complete. Awaiting budget.'),
('Zero-trust network architecture',            'migration', 'planned',     'high',     'Security',     '2026-09-01', 0,   ARRAY['Vendor selection','Network topology review'],          'RFP issued to 3 vendors. Selection Q2 2026.'),
('SBOM pipeline implementation',               'feature',   'in_progress', 'medium',   'DevOps',       '2026-06-30', 20,  ARRAY['Tool selection'],                                     'Syft + Grype POC 20% complete.'),
('Elasticsearch 8.x upgrade',                  'upgrade',   'planned',     'medium',   'Backend',      '2026-07-15', 0,   ARRAY['Index compatibility audit','Application query updates'],'EOL upgrade. Migration guide drafted.'),
('Centralized secrets management - Vault',     'feature',   'in_progress', 'high',     'Security',     '2026-06-01', 55,  ARRAY['Service account audit'],                              'HashiCorp Vault cluster deployed. Secret migration 55% complete.'),
('FinOps cost optimization sprint',            'feature',   'completed',   'medium',   'Platform',     '2026-04-30', 100, ARRAY[]::TEXT[],                                             'Achieved $18K/month savings via reserved instances and rightsizing.'),
('Automated compliance reporting',             'feature',   'in_progress', 'medium',   'Security',     '2026-07-01', 35,  ARRAY['Evidence API integration'],                           'This platform - SOC2 and GDPR modules complete.'),
('Platform observability 2.0',                 'upgrade',   'planned',     'medium',   'Platform',     '2026-08-15', 0,   ARRAY['Metrics cardinality audit'],                          'OpenTelemetry migration from legacy metrics stack.');
