export const RELATIONSHIPS = {
    partner: {
        type: 'partner',
        label: 'Partner of',
        inverseType: 'partner',
        inverseLabel: 'Partner of',
    },
    parent: {
        type: 'parent',
        label: 'Parent of',
        inverseType: 'child',
        inverseLabel: 'Child of',
    },
    child: {
        type: 'child',
        label: 'Child of',
        inverseType: 'parent',
        inverseLabel: 'Parent of',
    },
    sibling: {
        type: 'sibling',
        label: 'Sibling of',
        inverseType: 'sibling',
        inverseLabel: 'Sibling of',
    },
    colleague: {
        type: 'colleague',
        label: 'Colleague of',
        inverseType: 'colleague',
        inverseLabel: 'Colleague of',
    },
    introduced: {
        type: 'introduced',
        label: 'Introduced me to',
        inverseType: 'introduced_by',
        inverseLabel: 'Introduced by',
    },
    introduced_by: {
        type: 'introduced_by',
        label: 'Introduced by',
        inverseType: 'introduced',
        inverseLabel: 'Introduced me to',
    },
    friend: {
        type: 'friend',
        label: 'Friend of',
        inverseType: 'friend',
        inverseLabel: 'Friend of',
    },
    other: {
        type: 'other',
        label: 'Connected with',
        inverseType: 'other',
        inverseLabel: 'Connected with',
    },
};
/**
 * Returns the human-readable label describing the relationship from person A's perspective
 * or person B's perspective.
 */
export function getRelationshipLabel(relationshipType, isPersonA, customLabel) {
    if (customLabel)
        return customLabel;
    const meta = RELATIONSHIPS[relationshipType] || RELATIONSHIPS.other;
    return isPersonA ? meta.label : meta.inverseLabel;
}
