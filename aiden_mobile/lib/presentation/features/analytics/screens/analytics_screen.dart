import 'package:flutter/material.dart';

/// Analytics dashboard screen
class AnalyticsScreen extends StatelessWidget {
  final String botId;

  const AnalyticsScreen({super.key, required this.botId});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats cards
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'Total Chats',
                    value: '1,234',
                    icon: Icons.chat,
                    color: Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    title: 'Messages',
                    value: '8,567',
                    icon: Icons.message,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'Avg. Response',
                    value: '2.3s',
                    icon: Icons.timer,
                    color: Colors.orange,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _StatCard(
                    title: 'Satisfaction',
                    value: '94%',
                    icon: Icons.sentiment_satisfied,
                    color: Colors.purple,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Sections
            _buildSection(
              context,
              title: 'Sentiment Analysis',
              icon: Icons.psychology,
              child: _buildSentimentChart(context),
            ),

            const SizedBox(height: 16),

            _buildSection(
              context,
              title: 'Popular Topics',
              icon: Icons.topic,
              child: _buildTopicsList(context),
            ),

            const SizedBox(height: 16),

            _buildSection(
              context,
              title: 'Unanswered Questions',
              icon: Icons.help_outline,
              child: _buildUnansweredList(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildSentimentChart(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _SentimentIndicator(
          label: 'Positive',
          value: 0.72,
          color: Colors.green,
        ),
        _SentimentIndicator(
          label: 'Neutral',
          value: 0.20,
          color: Colors.grey,
        ),
        _SentimentIndicator(
          label: 'Negative',
          value: 0.08,
          color: Colors.red,
        ),
      ],
    );
  }

  Widget _buildTopicsList(BuildContext context) {
    final topics = [
      ('Product Questions', 45),
      ('Pricing', 32),
      ('Support', 28),
      ('Features', 21),
      ('Integration', 15),
    ];

    return Column(
      children: topics.map((topic) {
        final percentage = topic.$2 / 45;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(topic.$1),
                  Text('${topic.$2}%'),
                ],
              ),
              const SizedBox(height: 4),
              LinearProgressIndicator(
                value: percentage,
                borderRadius: BorderRadius.circular(4),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildUnansweredList(BuildContext context) {
    final questions = [
      'How do I integrate with Shopify?',
      'What are the API rate limits?',
      'Can I export data to CSV?',
    ];

    return Column(
      children: questions.map((q) {
        return ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(
            Icons.help_outline,
            color: Theme.of(context).colorScheme.error,
          ),
          title: Text(q),
          trailing: TextButton(
            onPressed: () {},
            child: const Text('Add Answer'),
          ),
        );
      }).toList(),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SentimentIndicator extends StatelessWidget {
  final String label;
  final double value;
  final Color color;

  const _SentimentIndicator({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            SizedBox(
              width: 60,
              height: 60,
              child: CircularProgressIndicator(
                value: value,
                strokeWidth: 6,
                backgroundColor: color.withOpacity(0.2),
                valueColor: AlwaysStoppedAnimation(color),
              ),
            ),
            Text(
              '${(value * 100).toInt()}%',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
