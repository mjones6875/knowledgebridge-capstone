package edu.kennesaw.knowledgebridge_api.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class JiraNaturalLanguageService {

    private static final String PROJECT_KEY = "KB";

    public String convertToJql(String naturalLanguageQuery) {
        if (naturalLanguageQuery == null
                || naturalLanguageQuery.isBlank()) {
            throw new IllegalArgumentException(
                    "Search query cannot be empty"
            );
        }

        String query = naturalLanguageQuery
                .trim()
                .toLowerCase(Locale.ROOT);

        List<String> conditions = new ArrayList<>();
        conditions.add("project = " + PROJECT_KEY);

        addIssueType(query, conditions);
        addStatus(query, conditions);
        addAssignee(query, conditions);
        addPriority(query, conditions);

        return String.join(" AND ", conditions)
                + " ORDER BY updated DESC";
    }

    private void addIssueType(
            String query,
            List<String> conditions
    ) {
        List<String> issueTypes = new ArrayList<>();

        if (containsAny(query, "bug", "bugs", "defect", "defects")) {
            issueTypes.add("Bug");
        }

        if (containsAny(query, "story", "stories")) {
            issueTypes.add("Story");
        }

        if (containsAny(query, "epic", "epics")) {
            issueTypes.add("Epic");
        }

        if (containsWholeWord(query, "task", "tasks")) {
            issueTypes.add("Task");
        }

        if (containsAny(query, "subtask", "subtasks", "sub-task", "sub-tasks")) {
            issueTypes.add("Subtask");
        }

        if (issueTypes.size() == 1) {
            conditions.add(
                    "issuetype = " + issueTypes.getFirst()
            );
        } else if (issueTypes.size() > 1) {
            conditions.add(
                    "issuetype IN ("
                            + String.join(", ", issueTypes)
                            + ")"
            );
        }
    }

    private boolean containsWholeWord(
            String query,
            String... words
    ) {
        for (String word : words) {
            String pattern =
                    ".*\\b" + java.util.regex.Pattern.quote(word) + "\\b.*";

            if (query.matches(pattern)) {
                return true;
            }
        }

        return false;
    }

    private void addStatus(
            String query,
            List<String> conditions
    ) {
        if (containsAny(
                query,
                "in progress",
                "being worked on",
                "currently working"
        )) {
            conditions.add("status = \"In Progress\"");
        } else if (containsAny(
                query,
                "done",
                "completed",
                "closed",
                "resolved"
        )) {
            conditions.add(
                    "statusCategory = Done"
            );
        } else if (containsAny(
                query,
                "to do",
                "todo",
                "open",
                "not started"
        )) {
            conditions.add(
                    "statusCategory = \"To Do\""
            );
        }
    }

    private void addAssignee(
            String query,
            List<String> conditions
    ) {
        if (containsAny(
                query,
                "assigned to me",
                "my issues",
                "my tasks",
                "my bugs",
                "my stories"
        )) {
            conditions.add("assignee = currentUser()");
        } else if (containsAny(
                query,
                "unassigned",
                "without assignee",
                "not assigned"
        )) {
            conditions.add("assignee IS EMPTY");
        }
    }

    private void addPriority(
            String query,
            List<String> conditions
    ) {
        if (query.contains("highest priority")) {
            conditions.add("priority = Highest");
        } else if (query.contains("high priority")) {
            conditions.add("priority = High");
        } else if (query.contains("medium priority")) {
            conditions.add("priority = Medium");
        } else if (query.contains("low priority")) {
            conditions.add("priority = Low");
        }
    }

    private boolean containsAny(
            String query,
            String... values
    ) {
        for (String value : values) {
            if (query.contains(value)) {
                return true;
            }
        }

        return false;
    }
}