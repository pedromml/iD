describe('iD.validations.mismatched_dates', function () {
    let context;

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
        let validator = iD.validationMismatchedDates(context);
        let changes = context.history().changes();
        let entities = changes.modified.concat(changes.created);
        let issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('has no errors on init', function() {
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with no EDTF tag', function() {
        createNode({ natural: 'tree', name: 'Arbre du Ténéré', start_date: '1673', end_date: '1973' });
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with date within EDTF range', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', start_date: '1900', 'start_date:edtf': '1550~/1900~', end_date: '1942' });
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way with date outside of EDTF range', function() {
        createNode({ natural: 'tree', name: 'The Tree That Owns Itself', start_date: '1901', 'start_date:edtf': '1550~/1900~', end_date: '1942' });
        let issues = validate();
        expect(issues).to.have.lengthOf(1);
        let issue = issues[0];
        expect(issue.type).to.eql('mismatched_dates');
        expect(issue.entityIds).to.have.lengthOf(1);
        expect(issue.entityIds[0]).to.eql('n-1');
    });

    it('suggests replacing date with bounds of EDTF range', function() {
        let validator = iD.validationMismatchedDates(context);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/..'))).to.deep.equal(['1234']);
        expect(validator.getReplacementDates(validator.parseEDTF('../5678'))).to.deep.equal(['5678']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/5678'))).to.deep.equal(['1234', '5678']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234-10/5678'))).to.deep.equal(['1234-10', '5678']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/5678-10-11'))).to.deep.equal(['1234', '5678-10-11']);
        expect(validator.getReplacementDates(validator.parseEDTF('1234/5678-10-11T12:13:14'))).to.deep.equal(['1234', '5678-10-11']);
    });
});
