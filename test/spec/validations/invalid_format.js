describe('iD.validations.invalid_format', function () {
    var context;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    function createNode(tags) {
        let n = iD.osmNode({id: 'n-1', loc: [4,4], tags: tags});

        context.perform(
            iD.actionAddEntity(n)
        );
    }

    function validate() {
        var validator = iD.validationFormatting(context);
        var changes = context.history().changes();
        var entities = changes.modified.concat(changes.created);
        var issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('has no errors on init', function() {
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with no EDTF tag', function() {
        createNode({ natural: 'tree', name: 'Arbre du Ténéré', start_date: '1673', end_date: '1973' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with okay EDTF tag', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', 'start_date:edtf': '1550~/1900~', end_date: '1942' });
        var issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way with invalid EDTF tag', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', 'start_date:edtf': '155X~/1900~', end_date: '1942' });
        var issues = validate();
        expect(issues).to.have.lengthOf(1);
        var issue = issues[0];
        expect(issue.type).to.eql('invalid_format');
        expect(issue.entityIds).to.have.lengthOf(1);
        expect(issue.entityIds[0]).to.eql('n-1');
    });

    it('flags way with OSM-style date tag', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', 'start_date': 'before C20', end_date: '1942' });
        var issues = validate();
        expect(issues).to.have.lengthOf(1);
        var issue = issues[0];
        expect(issue.type).to.eql('invalid_format');
        expect(issue.entityIds).to.have.lengthOf(1);
        expect(issue.entityIds[0]).to.eql('n-1');
    });
});
