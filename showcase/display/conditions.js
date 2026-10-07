// Original module numbers are internal implementation references only.
export const study1Groups = [
    { term: 'Baseline (No Uncertainty)', cards: [{ number: 1, title: 'Baseline (No Uncertainty)' }] },
    { term: 'CI (Confidence Interval)', cards: [
        { number: 2, title: 'No Interaction' }, { number: 5, title: 'High PIQ' }, { number: 19, title: 'Low PIQ' }
    ] },
    { term: 'EP (Ensemble Plot)', cards: [
        { number: 3, title: 'No Interaction' }, { number: 4, title: 'High PIQ' }, { number: 18, title: 'Low PIQ' }
    ] },
    { term: 'EPCI (Ensemble Plot w/ CI)', cards: [
        { number: 9, title: 'No Interaction' }, { number: 6, title: 'High PIQ' }, { number: 20, title: 'Low PIQ' }
    ] }
];
export const study2Groups = [
    { term: 'Hover', cards: [{ number: 21, title: 'Show one' }, { number: 22, title: 'Show all' }] },
    { term: 'Click', cards: [{ number: 23, title: 'Show one' }, { number: 24, title: 'Show all' }] },
    { term: 'Animation', cards: [{ number: 25, title: 'Show one' }, { number: 26, title: 'Show all' }] }
];
export const conditions = [...study1Groups, ...study2Groups].flatMap(group => group.cards);
