export namespace main {
	
	export class Education {
	    school: string;
	    degree: string;
	
	    static createFrom(source: any = {}) {
	        return new Education(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.school = source["school"];
	        this.degree = source["degree"];
	    }
	}
	export class Person {
	    name: string;
	    age: number;
	    edu?: Education;
	    parent?: Person;
	    mother?: Person;
	
	    static createFrom(source: any = {}) {
	        return new Person(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.age = source["age"];
	        this.edu = this.convertValues(source["edu"], Education);
	        this.parent = this.convertValues(source["parent"], Person);
	        this.mother = this.convertValues(source["mother"], Person);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

