import 'package:flutter/material.dart';

/// Leads list screen
class LeadsScreen extends StatelessWidget {
  final String botId;

  const LeadsScreen({super.key, required this.botId});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () {},
            tooltip: 'Export',
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 10,
        itemBuilder: (context, index) {
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: theme.colorScheme.primaryContainer,
                child: Text(
                  'J',
                  style: TextStyle(color: theme.colorScheme.onPrimaryContainer),
                ),
              ),
              title: Text('John Doe ${index + 1}'),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('john.doe${index + 1}@email.com'),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _StatusBadge(status: index % 3 == 0 ? 'new' : 'contacted'),
                      const SizedBox(width: 8),
                      Text(
                        '2 hours ago',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              trailing: IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: () {},
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final isNew = status == 'new';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isNew ? Colors.green.shade100 : Colors.blue.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: isNew ? Colors.green.shade700 : Colors.blue.shade700,
        ),
      ),
    );
  }
}
